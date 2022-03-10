$(() => {
  $.get('assets.yaml', {}, (response) => {
    const $main = $('#main');
    const assets = jsyaml.load(response);
    console.log('assets', assets);
    const $table = $('<table>');
    for (let asset of assets) {
      $table.append($('<tr>').append($('<td>').append(asset.type)).append($('<td>').append(asset.name)));
    }
    $main.append($table);
  });
});
