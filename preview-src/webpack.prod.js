const merge = require('webpack-merge');
const common = require('./webpack.common.js');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = merge(common, {
    plugins: [
        new UglifyJsPlugin({
            uglifyOptions: {
                warnings: false,
                output: {
                    comments: false
                }
            }
        })
    ]
})