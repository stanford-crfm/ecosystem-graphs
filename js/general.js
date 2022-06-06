function encodeUrlParams(params) {
  let s = '';
  for (let k in params)
    s += (s === '' ? '?' : '&') + k + '=' + encodeURIComponent(params[k]);
  return s;
}

function decodeUrlParams(str) {
  const params = {};
  if (str === '')
    return params;
  const items = str.substring(1).split(/&/);
  for (let i = 0; i < items.length; i++) {
    const pair = items[i].split(/=/);
    params[pair[0]] = decodeURIComponent(pair[1]);
  }
  return params;
}

function updateBrowserLocation(params) {
  // Update the address bar
  window.history.pushState({}, '', window.location.pathname + encodeUrlParams(params));
}

function openBrowserLocation(params) {
  // Update the address bar
  window.open(window.location.pathname + encodeUrlParams(params), 'blank_');
}

function multilineHtml(s) {
  return s.replace(/\n/g, '<br>');
}

function renderError(e) {
  return $('<div>').addClass('alert alert-danger').append(multilineHtml(e));
}

function getField(obj, key) {
  if (key in obj) {
    return obj[key];
  }
  console.error('Missing key', key, 'in', obj);
  return null;
}
