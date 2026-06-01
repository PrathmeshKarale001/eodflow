const rht = require('react-hot-toast');
console.log('Keys:', Object.keys(rht));
console.log('Has toast named export:', typeof rht.toast);
console.log('Has default export:', typeof rht.default);
console.log('default is function:', typeof rht.default === 'function');
if (rht.default) {
  console.log('default.success:', typeof rht.default.success);
}
if (rht.toast) {
  console.log('toast.success:', typeof rht.toast.success);
}
