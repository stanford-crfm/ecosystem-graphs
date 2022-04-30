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
 * AssetField represents a field of an Asset. Each AssetField has a value and
 * an optional explanation for the value.
 */
class AssetField {
  constructor(value, explanation) {
    this.value = value;
    this.explanation = explanation;
  }

  getValue() {
    return this.value;
  }

  getExplanation() {
    return this.explanation;
  }
 }

/**
 * An Asset in the ecosystem.
 */
class Asset {

  constructor(item, schema) {
    // Set the parameters
    this.schema = new AssetField(schema, null);
    this.type = new AssetField(getField(item, 'type'), null);

    // Loop through the schema to populate the asset fields
    schema.fields.forEach((schemaField) => {

      // The assset field we will populate */
      const assetField = new AssetField();
    
      // We expect each assetField to have a value and an explanation.
      // When reading the field from the schemaFieldValue, we populate each of
      // these fields as follows: 
      // (1) If the schemaFieldValue is an object that is not an Array, we try
      //     to read 'value' and 'explanation' fields to the respective fields
      //     in the AssetField. If the explanation field is not provided, we
      //     would read null.
      // (2) Otheriwise, we directly read schemaFieldValue to the value of 
      //     AssetField, and leave the explanation as null.
      const schemaFieldValue = getField(item, schemaField.name);
      if ((typeof schemaFieldValue === 'object') && !(schemaFieldValue instanceof Array)) {
        assetField.value = getField(schemaFieldValue, 'value');
        assetField.explanation = schemaFieldValue.explanation
      } else {
        assetField.value = schemaFieldValue;
      }

      // Once value is extracted, we perform type checking.
      if (schemaField.type === 'list') {
        if (!(assetField.value instanceof Array)) {
          console.error('Expected list for', schemaField.name, 'but got', assetField.value);
        }
      } else {
        if (!['string', 'number', 'boolean'].includes(typeof(assetField.value)) && !(assetField.value instanceof Date)) {
          console.error('Expected string, number, boolean, or date for', schemaField.name, 'but got', assetField.value);
        }
      }

      // Assigning the assetField value to be a field of this asset
      // @TODO Refactor the code to work with the AssetField object.
      this[schemaField.name] = assetField;
    });

    // Print warnings about any extraneous fields
    for (let key in item) {
      if (key != 'type' && !schema.hasField(key)) {
        console.error('Extra key', key, 'in', item);
      }
    }

    // To be filled out later
    this.downstreamAssets = new AssetField([], null);
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

function renderField(schemaField) {
  const text = schemaField.name.replace(/_/g, ' ');
  return $('<div>').append(text).append(helpIcon(schemaField.description, '#'));
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
  const href = encodeUrlParams({asset: asset.name.getValue()});
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

  $card.append($('<h3>').append(asset.name.getValue()));

  // Render upstream and downstream assets
  $card.append($('<div>', {class: 'block'}).append('Upstream: ').append(renderAssetLinks(nameToAsset, asset.dependencies.getValue())));
  $card.append($('<div>', {class: 'block'}).append('Downstream: ').append(renderAssetLinks(nameToAsset, asset.downstreamAssets.getValue())));

  // Render a single asset
  const $table = $('<table>', {class: 'table'});
  const $tbody = $('<tbody>');
  asset.schema.getValue().fields.forEach((schemaField) => {
    const value = asset[schemaField.name].getValue();

    $tbody.append($('<tr>')
      .append($('<td>').append(renderField(schemaField)))
      .append($('<td>').append(schemaField.name === 'dependencies' ? renderAssetLinks(nameToAsset, value) : renderValue(schemaField.type, value)))
    );
  });

  $table.append($tbody);
  $card.append($table);

  return $card;
}

function turnToDisplayName(name) {
  const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
  return capitalized.replace('_', ' ');
}

function renderCustomTable(selectedNameToAsset, allNameToAsset, columnProperties) {
  const $table = $('<table>', {class: 'table'});
  $table.append($('<thead>').append($('<tr>')));
  columnProperties.forEach( (columnName) => {
    $table.append($('<td>').append(turnToDisplayName(columnName)));
  });
  const $tbody = $('<tbody>');
  for (let name in selectedNameToAsset) {
    const asset = selectedNameToAsset[name];
    $tbody.append($('<tr>'));
    columnProperties.forEach( (columnName) => {
      let tdValue = null;
      if (columnName === 'name') {
        const href = encodeUrlParams({asset: asset.name.getValue()});
        tdValue = $('<a>', {href, target: 'blank_'}).append(asset.name.getValue());
      } else if (columnName === 'dependencies') {
        tdValue = renderAssetLinks(allNameToAsset, asset.dependencies.getValue());
      } else {
        tdValue = renderValue('', asset[columnName].getValue());
      }
      $tbody.append($('<td>').append(tdValue));
    });
  }
  $table.append($tbody);
  return $table;
}

function renderHome(allNameToAsset) {
  // Render the home page
  // @TODO once all the date values are refactored, pick the latest 5
  const latestModelNames = ["DALL·E 2", "Codex", "InstructGPT", "GPT-NeoX-20B"];
  const columnProperties = ['name', 'organization', 'created_date', 'access', 'size', 'dependencies'];
  const latestNameToAsset = latestModelNames.reduce((obj, key) => (obj[key] = allNameToAsset[key], obj), {});
  return renderCustomTable(latestNameToAsset, allNameToAsset, columnProperties);
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
    const href = encodeUrlParams({asset: asset.name.getValue()});
    const size = 'size' in asset ? asset.size.getValue() : null;
    $tbody.append($('<tr>')
      .append($('<td>').append(asset.type.getValue()))
      .append($('<td>').append($('<a>', {href, target: 'blank_'}).append(asset.name.getValue())))
      .append($('<td>').append(renderValue('', asset.organization.getValue())))
      .append($('<td>').append(renderValue('', asset.created_date.getValue())))
      .append($('<td>').append(renderValue('', size)))
      .append($('<td>').append(renderAssetLinks(nameToAsset, asset.dependencies.getValue())))
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
        id: asset.name.getValue(),
        shape: typeToShape[asset.type.getValue()],
        color: typeToColor[asset.type.getValue()],
      },
    });

    asset.dependencies.getValue().forEach((dep) => {
      edges.push({
        data: {
          id: asset.name.getValue() + '->' + dep,
          source: dep,
          target: asset.name.getValue(),
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
  } else if (urlParams.mode === 'table') {
    return renderAssetsTable(nameToAsset);
  } else {
    return renderHome(nameToAsset);
  }
 } 

function updateDownstreamAssets(nameToAsset) {
  // Use each asset's dependencies (upstream pointers) to update the corresponding downstream pointers.
  Object.values(nameToAsset).forEach((asset) => {
    asset.dependencies.getValue().forEach((dep) => {
      if (!(dep in nameToAsset)) {
        console.error('The node ', dep, 'does not exist in the graph.');
      }
      const depAsset = nameToAsset[dep];
      if (depAsset) {
        depAsset.downstreamAssets.value.push(asset.name.getValue());
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
