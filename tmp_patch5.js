const fs = require('fs');
let code = fs.readFileSync('public/js/app.js', 'utf8');

code = code.replace(
    /\<button class=\"btn\" style=\"width:30px; padding:0\.25rem; background:transparent; border:1px solid red; color:red;\" onclick=\"this\.parentElement\.remove\(\)\"\>\<i class=\"ph-trash\"\>\<\/i\>\<\/button\>/g,
    '<button type="button" style="width:34px; height:34px; display:flex; align-items:center; justify-content:center; background:#fee2e2; border:1px solid #f87171; border-radius:6px; color:#ef4444; cursor:pointer; font-weight:bold; flex-shrink:0; flex-grow:0; padding:0; line-height:1;" onclick="this.parentElement.remove()" title="Remover">✕</button>'
);

fs.writeFileSync('public/js/app.js', code);
console.log('Button Fixed');
