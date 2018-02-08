/**
 * Created by Necfol on 2/8/18.
 */
module.exports = {
  VIEW: ['*.ejs', '*.jade'],
  NPM: {
    registry: {
      'NPM': 'npm config set registry http://registry.npmjs.org',
      'UED': 'npm config set registry http://ued.vemic.com:4873'
    }
  }
};