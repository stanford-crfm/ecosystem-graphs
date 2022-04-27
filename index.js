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

/**
 * AssetField of an Asset.
 */
 class AssetField {

  constructor(value, explanation) {
    this.value = value;
    this.explanation = explanation;
  }
 }

/**
 * An Asset in the ecosystem.
 */
class Asset {

  constructor(item, schema) {
    /* Set the parameters */ 
    this.schema = schema;
    this.type = getField(item, 'type');

    /* Loop through the schema to populate the asset fields */ 
    schema.fields.forEach((schemaField) => {

      /* The assset field we will populate */
      var assetField = new AssetField();

      /*
      * We expect each assetField to have a value and an explanation field.
      * When reading the field from the schemaFieldValue, we populate each of
      * these fields as follows: 
      * (1) If the schemaFieldValue is an object with exactly two fields, 
      *     'value' and 'explanation', we directly read these into the assetField.
      * (2) If the schemaFieldValue is an object with only the 'value' field, we
      *     read it to the corresponding field of the assetField, and let the
      *     explanation field be null.
      * (3) If the schemaFieldValue doesn't conform to the rules in (1) and (2), 
      *     we directly assign it to the value field of the assetField, and let the
      *     explanation field be null.
      */
      const schemaFieldValue = getField(item, schemaField.name);
      const is_object = typeof schemaFieldValue === 'object';
      const has_value = is_object && 'value' in schemaFieldValue;
      const has_explanation = is_object && 'explanation' in schemaFieldValue;
      const object_form1 = Object.keys(schemaFieldValue).length === 2 && 
                           has_value && has_explanation;
      const object_form2 = Object.keys(schemaFieldValue).length === 1 && 
                           has_value;
      if ( object_form1 || object_form2 ) {
        assetField.value = schemaFieldValue['value'];
        assetField.explanation = schemaFieldValue['explanation'];
      } else {
        assetField.value = schemaFieldValue;
      }

      /*
      * Once we have the value field extracted, we perform type checking
      * against the schema types.
      */
      if (schemaField.type === 'list') {
        if ( !(assetField.value instanceof Array) ) {
          console.error('Expected list for', schemaField.name, 'but got', assetField.value);
        }
      } else {
        if (!['string', 'number', 'boolean'].includes(typeof(assetField.value)) && !(assetField.value instanceof Date)) {
          console.error('Expected string, number, boolean, or date for', schemaField.name, 'but got', assetField.value);
        }
      }

      /* Assigning the assetField value to be a field of this asset */
      // @TODO Refactor the code to work with the AssetField object.
      this[schemaField.name] = assetField.value;
    });

    // Print warnings about any extraneous fields
    for (let key in item) {
      if (key != 'type' && !schema.hasField(key)) {
        console.error('Extra key', key, 'in', item);
      }
    }

    // To be filled out later
    this.downstreamAssets = [];
  }
}

////////////////////////////////////////////////////////////

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
  const converter = new showdown.Converter();
  if (type === 'list') {
    return renderList(value.map((elemValue) => renderValue(null, elemValue)));
  } else if (type === 'url' && value.indexOf('None') == -1 && value.indexOf('TODO') == -1) {
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

function renderAssetLink(nameToAsset, assetName) {
  const asset = getField(nameToAsset, assetName);
  if (!asset) {
    return assetName;
  }
  const href = encodeUrlParams({asset: asset.name});
  return $('<a>', {href, target: 'blank_'}).append(assetName);
}

function renderAssetLinks(nameToAsset, assetNames) {
  return renderList(assetNames.map((name) => renderAssetLink(nameToAsset, name)));
}

function renderAsset(nameToAsset, assetName) {
  const asset = getField(nameToAsset, assetName);
  if (!asset) {
    return renderError('Invalid asset: ' + assetName);
  }

  const $card = $('<div>');

  $card.append($('<h3>').append(asset.name));

  // Render upstream and downstream assets
  $card.append($('<div>', {class: 'block'}).append('Upstream: ').append(renderAssetLinks(nameToAsset, asset.dependencies)));
  $card.append($('<div>', {class: 'block'}).append('Downstream: ').append(renderAssetLinks(nameToAsset, asset.downstreamAssets)));

  // Render a single asset
  const $table = $('<table>', {class: 'table'});
  const $tbody = $('<tbody>');
  asset.schema.fields.forEach((field) => {
    const value = asset[field.name];

    $tbody.append($('<tr>')
      .append($('<td>').append(renderField(field)))
      .append($('<td>').append(field.name === 'dependencies' ? renderAssetLinks(nameToAsset, value) : renderValue(field.type, value)))
    );
  });

  $table.append($tbody);
  $card.append($table);

  return $card;
}

function renderAssetsTable(nameToAsset) {
  // Render a list of assets
  const $table = $('<table>', {class: 'table'});
  $table.append($('<thead>').append($('<tr>')
    .append($('<td>').append('Type'))
    .append($('<td>').append('Name'))
    .append($('<td>').append('Organization'))
    .append($('<td>').append('Created date'))
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
      .append($('<td>').append(renderValue('', asset.created_date)))
      .append($('<td>').append(renderValue('', asset.size)))
      .append($('<td>').append(renderAssetLinks(nameToAsset, asset.dependencies)))
    );
  }
  $table.append($tbody);
  return $table;
}

function renderAssetsGraph(nameToAsset) {
  // Render the ecosystem graph
  const $graph = $('<div>', {class: 'graph'});

  const nodes = [];
  const edges = [];

  const typeToShape = {
    'dataset': 'ellipse',
    'model': 'square',
    'application': 'hexagon',
  };

  const typeToColor = {
    'dataset': 'orange',
    'model': 'dodgerblue',
    'application': 'firebrick',
  };

  Object.values(nameToAsset).forEach((asset) => {
    nodes.push({
      data: {
        id: asset.name,
        shape: typeToShape[asset.type],
        color: typeToColor[asset.type],
      },
    });

    asset.dependencies.forEach((dep) => {
      edges.push({
        data: {
          id: asset.name + '->' + dep,
          source: dep,
          target: asset.name,
        },
      });
    });
  });

  $graph.ready(() => {
    const cy = cytoscape({
      container: $graph.get(0),
      elements: {nodes, edges},
      layout: {
        name: 'cose',
        randomize: false,
        componentSpacing: 100,
        nodeOverlap: 10,
        //nodeDimensionsIncludeLabels: true,
        nodeRepulsion: function( node ){ return 4096; },
        //padding: 30,
        gravity: 0.5
      },
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(id)',
            shape: 'data(shape)',
            'background-color': 'data(color)',
            'text-wrap': 'wrap',
            'text-max-width': 30,
            'text-valign': 'center',
            'color': 'white',
            'text-size': 20,
            'padding': 40,
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 3,
            'curve-style': 'straight',
            'target-arrow-shape': 'triangle',
          },
        },
      ],
    });

    cy.on('click', (e) => {
      const data = e.target._private.data;
      const assetName = data.id;
      if (assetName && !data.source) {
        openBrowserLocation({asset: assetName});
      }
    });
  });

  return $graph;
}

function render(urlParams, nameToAsset) {
  if (urlParams.asset) {
    return renderAsset(nameToAsset, urlParams.asset);
  } else if (urlParams.mode === 'graph') {
    return renderAssetsGraph(nameToAsset);
  } else {
    return renderAssetsTable(nameToAsset);
  }
}

function updateDownstreamAssets(nameToAsset) {
  // Use each asset's dependencies (upstream pointers) to update the corresponding downstream pointers.
  Object.values(nameToAsset).forEach((asset) => {
    asset.dependencies.forEach((dep) => {
      if (!(dep in nameToAsset)) {
        console.error('The node ', dep, 'does not exist in the graph.');
      }
      const depAsset = nameToAsset[dep];
      if (depAsset) {
        depAsset.downstreamAssets.push(asset.name);
      }
    });
  });
}


$(() => {
  const urlParams = decodeUrlParams(window.location.search);

  const $main = $('#main');
  const typeToSchema = {};  // asset type (e.g., "model") => schema
  const nameToAsset = {};  // asset name (e.g., "GPT-3") => asset

  const paths = [
    'assets/cohere.yaml',
    'assets/deepmind.yaml',
    'assets/eleutherai.yaml',
    'assets/google.yaml',
    'assets/microsoft.yaml',
    'assets/openai.yaml',
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
      updateDownstreamAssets(nameToAsset);
      $main.append(render(urlParams, nameToAsset));
    });
  });
});