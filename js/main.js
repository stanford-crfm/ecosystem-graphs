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
 }

/**
 * An Asset in the ecosystem.
 */
class Asset {

  constructor(item, schema) {
    // Set the parameters
    this.schema = schema;
    this.type = getField(item, 'type');
    // This field is an object matching field_name => AssetField
    this.fields = {};

    // Loop through the schema to populate the asset fields
    schema.fields.forEach((schemaField) => {

      // The asset fields we will populate
      let value = null, explanation = null;

      // We expect each assetField to be an object with a "value" and an
      // "explanation" key. In the absence of these keys, we read the object
      // directly (e.g. arrays or dates)
      const schemaFieldValue = getField(item, schemaField.name);
      const isObject = typeof schemaFieldValue === 'object';
      const hasValue = isObject && 'value' in schemaFieldValue;
      const hasExplanation = isObject && 'explanation' in schemaFieldValue;
      if (hasValue && hasExplanation) {
        value = getField(schemaFieldValue, 'value');
        explanation = schemaFieldValue.explanation;
      } else if (hasValue || hasExplanation) {
        console.error(
          'Error in schemaField', schemaField, 'Don\'t use value and explanation fields without one another. Couldn\'t read the asset, fix.'
        );
      } else {
        value = schemaFieldValue;
      }

      // Once value is extracted, we perform type checking.
      if (schemaField.type === 'list') {
        if (!(value instanceof Array)) {
          console.error('Expected list for', schemaField.name, 'but got', value);
        }
      } else {
        if (!['string', 'number', 'boolean'].includes(typeof(value)) && !(value instanceof Date)) {
          console.error('Expected string, number, boolean, or date for', schemaField.name, 'but got', value);
        }
      }

      this.fields[schemaField.name] = new AssetField(value, explanation);
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

function updateDownstreamAssets(nameToAsset) {
  // Use each asset's dependencies (upstream pointers) to update the corresponding downstream pointers.
  Object.values(nameToAsset).forEach((asset) => {
    asset.fields.dependencies.value.forEach((dep) => {
      if (!(dep in nameToAsset)) {
        console.error('The node ', dep, 'does not exist in the graph.');
      }
      const depAsset = nameToAsset[dep];
      if (depAsset) {
        depAsset.downstreamAssets.push(asset.fields.name.value);
      }
    });
  });
}

////////////////////////////////////////////////////////////

function getStandardSize(value) {
  const thousand = 1000;
  const dataSizeDict = {'B': 0, 'KB': 1, 'MB': 2, 'GB': 3, 'TB': 4, 'PB': 5};
  const modelSizeDict = {'M': 2, 'B': 3, 'T': 4};
  if (value.includes('parameters')) {
    var size = value.split(' ')[0];
    const unit = size.slice(-1);
    const exp = modelSizeDict[unit];
    size = size.substring(0, size.length - 1);
    value = Math.pow(thousand, exp);
  } else {
    const arr = value.split(' ');
    const num = parseInt(arr[0]);
    const unit = arr[2];
    const exp = dataSizeDict[unit];
    value = Math.pow(thousand, exp);
  }
  return value
}

function compareValues(valueA, valueB, columnName) {
  // Filter for null, empty and unknown values
  if (valueA === null) {
    return -1;
  } else if (valueB === null) {
    return 1;
  } else if (valueA === "") {
    return -1;
  } else if (valueB === "") {
    return 1;
  } else if (valueA === "unknown") {
    return -1;
  } else if (valueB === "unknown") {
    return 1;
  }

  // Standardize the value
  if (columnName === "Created date") {
    valueA = Date.parse(valueA);
    valueB = Date.parse(valueB);
  } else if (columnName === "Size") {
    valueA = getStandardSize(valueA);
    valueB = getStandardSize(valueB);
  } 
  // @TODO Decide how to sort the "dependencies" column
  
  // Compare the values
  if (valueA > valueB) {
    return 1;
  } else if (valueA < valueB) {
    return -1;
  } else {
    return 0;
  }
}

// const $search = $('<input>', {type: 'text', size: 40, placeholder: 'Enter regex query (enter to open all)'});
// $search.keyup((e) => {
//   // Open up all match specs
//   if (e.keyCode === 13) {
//     const href = encodeUrlParams(Object.assign(urlParams, {runSpec: '.*' + query + '.*'}));
//     window.open(href);
//   }
//   query = $search.val();
//   renderTable();
// });

function filterTable(query) {

  // Get rows
  const rows = $('tr').slice(1); // Skip the header row

  query = query.toLowerCase();

  if (query.includes('=')) {
    // Filter columns
    // @TODO placeholder comment
    let a = 2;
  } else {
    // Filter all values
    [].forEach.call(rows, function (row) {
      const fieldValue = $(row).find("td .field-value");
      const values = $(fieldValue).children().not(":last");

      let found = false;
      [].forEach.call(values, function (value) {
        const innerHTML = value.innerHTML.toLowerCase();
        if (innerHTML.includes(query)) {
          found = true;
        }
      });

      if (found) {
        $(row).show();
      } else {
        $(row).hide();
      }

    });
  }
}

function sortColumn(columnName) {
  // Get the index for the column
  const headerRow = $('tr').slice(0)[0];
  const index = headerRow.innerText.split('\t').indexOf(columnName);

  // Get the current direction
  const direction = globalThis.tableDirections[index] || 'desc';

  // A factor based on the direction
  const multiplier = (direction === 'asc') ? 1 : -1;

  // Get rows
  const rows = $('tr').slice(1); // Skip the header row

  // Sort rows
  rows.sort((rowA, rowB) => {
    const fvA = $(rowA).find("td .field-value")[index];
    const fvB = $(rowB).find("td .field-value")[index];
    const valueA = $(fvA).children()[0].innerHTML;
    const valueB = $(fvB).children()[0].innerHTML;
    return multiplier * compareValues(valueA, valueB, columnName);
  });

  // Create a new tbody
  const newTBody = $('<tbody>');

  // // // Append new rows
  [].forEach.call(rows, function (row) {
    newTBody.append(row);
  });

  // Replace the table body with the newly created table body
  const tbody = $('tbody');
  tbody.replaceWith(newTBody);

  // Reverse the direction
  globalThis.tableDirections[index] = direction === 'asc' ? 'desc' : 'asc';
}

////////////////////////////////////////////////////////////

function helpIcon(help, link) {
  // Show a ?
  return $('<a>', {href: link, target: 'blank_', class: 'help-icon'}).append($('<img>', {src: 'img/info-icon.png', width: 15, title: help}));
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

function renderAccessType(value) {
  const valueToColor = {
    'Full public access': '#c0eec0',  // Slightly lighter than lightgreen
    'Limited public access': 'papayawhip',
    'No public access': '#f0b0b0'  // Slightly lighter than lightcoral
  }
  const color = value in valueToColor ? valueToColor[value] : 'mistyrose';
  const textElement = $('<span>').css("background-color", color).append(value);
  return textElement;
}

function renderField(schemaField) {
  const text = schemaField.name.replace(/_/g, ' ');
  return $('<div>').append(text).append(helpIcon(schemaField.description, '#'));
}

function renderValueExplanation(type, value, explanation) {
  const converter = new showdown.Converter();
  // Render value
  let renderedValue = $('<div>').append(value);
  if (value === 'unknown' || value === 'none') {
    renderedValue = converter.makeHtml(value);
  } else if (value instanceof Date) {
    let dateString = value.toLocaleDateString('en-us', {year:"numeric", month:"short", day:"numeric"});
    renderedValue = converter.makeHtml(dateString);
  } else if (type === 'list') {
    renderedValue = renderList(value.map((elemValue) => renderValueExplanation(null, elemValue, null)));
  } else if (type === 'url') {
    renderedValue = $('<a>', {href: value, target: 'blank_'}).append(value);
  } else if (type === 'access_type') {
    renderedValue = converter.makeHtml(value);
    // renderedValue = renderAccessType(value);
  } else if (typeof(value) === 'string') {
    renderedValue = converter.makeHtml(value);
  }
  // Wrap the value in a custom element
  const fieldValue = $('<div>', {class: 'field-value'}).append(renderedValue);

  // Render explanation, if provided
  let renderedExplanation = converter.makeHtml(explanation);
  const fieldExplanation = $('<div>', {class: 'field-explanation'}).append(renderedExplanation);
  return $('<div>').append(fieldValue)
                    .append(fieldExplanation);
}

function renderAssetLink(nameToAsset, assetName) {
  const asset = getField(nameToAsset, assetName);
  if (!asset) {
    return assetName;
  }
  const href = encodeUrlParams({asset: asset.fields.name.value});
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

  $card.append($('<h3>').append(asset.fields.name.value));

  // Render upstream and downstream assets
  $card.append($('<div>', {class: 'block'}).append('Upstream: ').append(renderAssetLinks(nameToAsset, asset.fields.dependencies.value)));
  $card.append($('<div>', {class: 'block'}).append('Downstream: ').append(renderAssetLinks(nameToAsset, asset.downstreamAssets)));

  // Render a single asset
  const $table = $('<table>', {class: 'table'});
  const $tbody = $('<tbody>');
  asset.schema.fields.forEach((schemaField) => {
    const value = asset.fields[schemaField.name].value;
    const explanation = asset.fields[schemaField.name].explanation;

    $tbody.append($('<tr>')
      .append($('<td>').append(renderField(schemaField)))
      .append($('<td>').append(schemaField.name === 'dependencies' ? renderAssetLinks(nameToAsset, value) : renderValueExplanation(schemaField.type, value, explanation)))
    );
  });

  $table.append($tbody);
  $card.append($table);

  return $card;
}

function renderFieldName(fieldName) {
  // Capitalizes and removes '_' from a fieldName (which should be a field name
  // from the schema, such as created_date, name, etc.)
  const capitalized = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
  return capitalized.replace('_', ' ');
}

/**
 * Renders a table given the column properties.
 * @param {Array.<Asset>} selectedAssets - Array of the assets that will be
 *   rendered in the custom table.
 * @param {Object.<string, Asset>} allNameToAsset - Object mapping the names of
 *   all the assets in the ecosystem to their Asset representation.
 * @param {Array.<string>} columnNames - Columns that will be included in the
 *   table.
 */
function renderCustomTable(selectedAssets, allNameToAsset, columnNames) {
  const $table = $('<table>', {class: 'table'});
  const $thead = $('<thead>');
  const $headRow = $('<tr>');
  // Add column names
  columnNames.forEach((columnName, index) => {
    const renderedName = renderFieldName(columnName);
    const onclickString = 'sortColumn(\'' + renderedName + '\')';
    $headRow.append($('<th>', {onClick: onclickString}).append(renderedName));
  });
  $thead.append($headRow);
  $table.append($thead);
  // Keep track of the directions, used to sort asc and desc
  globalThis.tableDirections = Array.from(columnNames).map(function (header) {
    return '';
  });
  // Add body
  const $tbody = $('<tbody>');
  selectedAssets.forEach((asset) => {
    const $bodyRow = $('<tr>');
    columnNames.forEach((columnName) => {
      let tdValue = null;
      if (columnName === 'type') {
        tdValue = renderValueExplanation('', asset.type, null);
      } else if (columnName === 'name') {
        const href = encodeUrlParams({asset: asset.fields.name.value});
        const fieldValue = $('<a>', {href, target: 'blank_'}).append(asset.fields.name.value);
        tdValue = $('<div>', {class: 'field-value'}).append(fieldValue);
      } else if (columnName === 'dependencies') {
        const fieldValue = renderAssetLinks(allNameToAsset, asset.fields.dependencies.value);
        tdValue = $('<div>', {class: 'field-value'}).append(fieldValue);
      } else {
        //
        let type = '';
        asset.schema.fields.forEach(item => item.name === columnName ? type = item.type : '');
        const value = columnName in asset.fields ? asset.fields[columnName].value : null;
        const explanation = columnName in asset.fields ? asset.fields[columnName].explanation : null;
        tdValue = renderValueExplanation(type, value, explanation);
      }
      $bodyRow.append($('<td>').append(tdValue));
    });
    $tbody.append($bodyRow);
  });
  $table.append($tbody);
  return $table;
}

function renderAssetsTable(nameToAsset) {
  // Render the table
  const columnNames = [
    'type', 'name', 'organization', 'created_date', 'size', 'access',
    'dependencies',
  ];
  const assets = Object.keys(nameToAsset).map((key) => (nameToAsset[key]));
  const $table = renderCustomTable(assets, nameToAsset, columnNames);

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
    'undocumented': 'ellipse',
  };

  const typeToColor = {
    'dataset': 'orange',
    'model': 'dodgerblue',
    'application': 'firebrick',
    'undocumented': 'gray',
  };

  Object.values(nameToAsset).forEach((asset) => {
    nodes.push({
      data: {
        id: asset.fields.name.value,
        shape: typeToShape[asset.type],
        color: typeToColor[asset.type],
      },
    });

    asset.fields.dependencies.value.forEach((dep) => {
      edges.push({
        data: {
          id: asset.fields.name.value + '->' + dep,
          source: dep,
          target: asset.fields.name.value,
        },
      });
    });
  });

  undocumentedDeps = Array.from(new Set(
    edges.map(edge => edge.data.source)
         .filter(dep => !(dep in nameToAsset))
  )).sort();

  console.log("The following dependencies are undocumented.");
  console.log(undocumentedDeps);

  undocumentedDeps.forEach(dep => {
    nodes.push({
      data: {
        id: dep,
        shape: typeToShape["undocumented"],
        color: typeToColor["undocumented"],
      },
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

////////////////////////////////////////////////////////////

// UI Helpers

function toggleExplanation(button) {
  const newText = $(button).text() === "Show Details" ? "Hide Details" : "Show Details"
  $(".field-explanation").toggle();
  $(button).text(newText);
}

function setUpSearch() {
  const $search = $('#table-search');
  let query = '';
  $search.keyup((e) => {
    if (e.keyCode === 13) {
      // Enter @TODO
    }
    query = $search.val();
    filterTable(query);
  });
}

////////////////////////////////////////////////////////////

// Home Page
function renderHomePage(pageContainer) {
  $("nav").hide();
  $.get("components/home.html", function(data){
    pageContainer.append(data);
  });
}

// Table Page
function renderTablePage(pageContainer, nameToAsset) {
  $.get("components/table.html", function(data){
    pageContainer.append(data);
    const tableContainer = $("#table-container");
    setUpSearch();
    const table = renderAssetsTable(nameToAsset);
    tableContainer.append(table);
    $(".field-explanation").toggle();
    // Sort by created_date, name
    sortColumn("Name");
    sortColumn("Created date");
  });

}

// Graph Page
function renderGraphPage(pageContainer, nameToAsset) {
  const graph = renderAssetsGraph(nameToAsset);
  pageContainer.append(graph);
}

function renderPageContent(nameToAsset) {
  const urlParams = decodeUrlParams(window.location.search);
  const pageContainer = $('#main');
  const mode = urlParams.mode || 'home';
  if (urlParams.asset) {
    const content = renderAsset(nameToAsset, urlParams.asset);
    pageContainer.append(content);
  } else if (mode === 'home') {
    renderHomePage(pageContainer);
  } else if (mode === 'table') {
    renderTablePage(pageContainer, nameToAsset);
  } else if (mode === 'graph') {
    renderGraphPage(pageContainer, nameToAsset);
  } else {
    const content = renderError('Unrecognized mode: ' + mode + '.');
    pageContainer.append(content);
  }
}

function renderNavBar() {
  $.get("components/nav.html", function(data){
    $("#nav-placeholder").replaceWith(data);
  });
}

function loadAssetsAndRenderPageContent() {

  const paths = [
    'assets/ai2.yaml',
    'assets/ai21.yaml',
    'assets/aleph_alpha.yaml',
    'assets/alibaba.yaml',
    'assets/anthropic.yaml',
    'assets/argonne.yaml',
    'assets/assembly.yaml',
    'assets/baai.yaml',
    'assets/baidu.yaml',
    'assets/bain.yaml',
    'assets/be_my_eyes.yaml',
    'assets/bigscience.yaml',
    'assets/brex.yaml',
    'assets/cmu.yaml',
    'assets/cohere.yaml',
    'assets/databricks.yaml',
    'assets/deepmind.yaml',
    'assets/duckduckgo.yaml',
    'assets/duolingo.yaml',
    'assets/eleutherai.yaml',
    'assets/google.yaml',
    'assets/hubspot.yaml',
    'assets/huggingface.yaml',
    'assets/instacart.yaml',
    'assets/juni.yaml',
    'assets/khan.yaml',
    'assets/laion.yaml',
    'assets/latitude.yaml',
    'assets/linkedin.yaml',
    'assets/meta.yaml',
    'assets/microsoft.yaml',
    'assets/naver.yaml',
    'assets/neeva.yaml',
    'assets/notion.yaml',
    'assets/nvidia.yaml',
    'assets/openai.yaml',
    'assets/othersideai.yaml',
    'assets/perplexity.yaml',
    'assets/quizlet.yaml',
    'assets/quora.yaml',
    'assets/robin.yaml',
    'assets/salesforce.yaml',
    'assets/sana.yaml',
    'assets/shanghai.yaml',
    'assets/shop.yaml',
    'assets/snap.yaml',
    'assets/speak.yaml', 
    'assets/spotify.yaml',       
    'assets/stability.yaml',
    'assets/stanford.yaml',
    'assets/together.yaml',
    'assets/trevor.yaml',  
    'assets/tsinghua.yaml',
    'assets/uw.yaml',
    'assets/viable.yaml',
    'assets/yandex.yaml',
    'assets/you.yaml',
  ];

  $.get('js/schemas.yaml', {}, (response) => {
    // First read the schema...
    const typeToSchema = {};  // asset type (e.g., "model") => schema
    const raw = jsyaml.load(response);
    console.log('Read schemas', raw);
    for (const name in raw) {
      typeToSchema[name] = new Schema(name, raw[name]);
    }

    // Then read all the assets in parallel
    const nameToAsset = {};  // asset name (e.g., "GPT-3") => asset
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
      renderPageContent(nameToAsset);
    });
  });
};
