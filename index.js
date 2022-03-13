class Field {
  constructor(raw) {
    this.name = getField(raw, 'name');
    this.description = getField(raw, 'description');
    this.type = raw.type;
  }
}

class Schema {
  constructor(name, raw) {
    this.name = name;
    this.fields = raw.map((field) => new Field(field));
  }

  hasField(name) {
    return this.fields.some((field) => field.name === name);
  }
}

class Asset {
  constructor(raw, schema) {
    this.schema = schema;

    this.type = getField(raw, 'type');
    schema.fields.forEach((field) => {
      const value = getField(raw, field.name);
      if (field.type === 'list') {
        if (!(value instanceof Array)) {
          console.error('Expected list for', field.name, 'but got', value);
        }
      } else {
        if (!['string', 'number', 'boolean'].includes(typeof(value)) && !(value instanceof Date)) {
          console.error('Expected string, number, or boolean for', field.name, 'but got', value);
        }
      }
      this[field.name] = value;
    });
    // Print warnings about any extraneous fields
    for (let key in raw) {
      if (key != 'type' && !schema.hasField(key)) {
        console.error('Extra key', key, 'in', raw);
      }
    }

    // To be filled out later
    this.downstreamAssets = [];
  }
}

$(() => {
  const urlParams = decodeUrlParams(window.location.search);
  const converter = new showdown.Converter();

  const $main = $('#main');
  const typeToSchema = {};  // asset type (e.g., "model") => schema
  const nameToAsset = {};  // asset name (e.g., "GPT-3") => asset

  function renderAssetsTable() {
    // Render a list of assets
    const $table = $('<table>', {class: 'table'});
    $table.append($('<thead>').append($('<tr>')
      .append($('<td>').append('Type'))
      .append($('<td>').append('Name'))
      .append($('<td>').append('Organization'))
      .append($('<td>').append('Size'))
      .append($('<td>').append('Dependencies'))
    ));
    const $tbody = $('<tbody>');
    for (let name in nameToAsset) {
      const asset = nameToAsset[name];
      const href = encodeUrlParams({asset: asset.name});
      $tbody.append($('<tr>')
        .append($('<td>').append(asset.type))
        .append($('<td>').append($('<a>', {href, target: 'blank_'}).append(asset.name)))
        .append($('<td>').append(asset.organization))
        .append($('<td>').append(asset.size))
        .append($('<td>').append(renderList(asset.dependencies.map(renderAssetLink))))
      );
    }
    $table.append($tbody);
    return $table;
  }

  function helpIcon(help, link) {
    // Show a ?
    return $('<a>', {href: link, target: 'blank_', class: 'help-icon'}).append($('<img>', {src: 'info-icon.png', width: 15, title: help}));
  }

  function renderList(items) {
    const $list = $('<span>');
    items.forEach((item, i) => {
      if (i > 0) {
        $list.append(' | ');
      }
      $list.append(item);
    });
    return $list;
  }

  function renderField(field) {
    const text = field.name.replace(/_/g, ' ');
    return $('<div>').append(text).append(helpIcon(field.description, '#'));
  }

  function renderValue(type, value) {
    if (type === 'list') {
      return renderList(value.map((elemValue) => renderValue(null, elemValue)));
    } else if (type === 'url') {
      return $('<a>', {href: value, target: 'blank_'}).append(value);
    } else {
      // Default: render string as markdown
      if (typeof(value) === 'string') {
        return converter.makeHtml(value);
      } else {
        return value;
      }
    }
  }

  function renderAssetLink(assetName) {
    const asset = getField(nameToAsset, assetName);
    if (!asset) {
      return assetName;
    }
    const href = encodeUrlParams({asset: asset.name});
    return $('<a>', {href, target: 'blank_'}).append(assetName);
  }

  function renderAsset(assetName) {
    const asset = getField(nameToAsset, assetName);
    if (!asset) {
      return renderError('Invalid asset: ' + assetName);
    }

    const $card = $('<div>');

    // Render upstream and downstream assets
    $card.append($('<div>', {class: 'block'}).append('Upstream: ').append(renderList(asset.dependencies.map(renderAssetLink))));
    $card.append($('<div>', {class: 'block'}).append('Downstream: ').append(renderList(asset.downstreamAssets.map(renderAssetLink))));

    // Render a single asset
    const $table = $('<table>', {class: 'table'});
    const $tbody = $('<tbody>');
    asset.schema.fields.forEach((field) => {
      const value = asset[field.name];

      $tbody.append($('<tr>')
        .append($('<td>').append(renderField(field)))
        .append($('<td>').append(renderValue(field.type, value)))
      );
    });

    $table.append($tbody);
    $card.append($table);

    return $card;
  }

  function renderAssetsGraph() {
    // Render the ecosystem graph
    return 'Under construction.';
  }

  function render() {
    if (urlParams.asset) {
      $main.append(renderAsset(urlParams.asset));
    } else if (urlParams.mode === 'graph') {
      $main.append(renderAssetsGraph());
    } else {
      $main.append(renderAssetsTable());
    }
  }

  function updateDownstreamAssets() {
    // Use each asset's dependencies (upstream pointers) to update the corresponding downstream pointers.
    Object.values(nameToAsset).forEach((asset) => {
      asset.dependencies.forEach((dep) => {
        const depAsset = nameToAsset[dep];
        if (depAsset) {
          depAsset.downstreamAssets.push(asset.name);
        }
      });
    });
  }

  const paths = [
    'assets/openai.yaml',
    'assets/eleutherai.yaml',
    'assets/google.yaml',
    'assets/deepmind.yaml',
  ];

  $.get('schemas.yaml', {}, (response) => {
    // First read the schema...
    const raw = jsyaml.load(response);
    console.log('Read schemas', raw);
    for (const name in raw) {
      typeToSchema[name] = new Schema(name, raw[name]);
    }

    // Then read all the assets in parallel
    $.when(
      ...paths.map((path) => {
        return $.get(path, {}, (response) => {
          const raw = jsyaml.load(response);
          console.log('Read assets', path, raw);
          raw.forEach((item) => {
            nameToAsset[item.name] = new Asset(item, getField(typeToSchema, item.type));
          });
        })
      })
    ).then(() => {
      updateDownstreamAssets();
      render();
    });
  });
});
