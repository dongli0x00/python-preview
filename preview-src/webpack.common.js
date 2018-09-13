const path = require('path');
const webpack = require('webpack');

module.exports = {
    entry: './index.ts',

    output: {
        path: path.resolve(__dirname, '..', 'assets'),
        filename: 'index.js'
    },

    module: {
        loaders: [
            {
                test: /\.ts$/,
                loader: 'ts-loader'
            }
        ]
    },

    resolve: {
        extensions: ['.ts', '.js'],
        alias: {
            "jquery": path.resolve(__dirname, 'lib', 'jquery-3.0.0.min.js'),
            "$": path.resolve(__dirname, 'lib', 'jquery-3.0.0.min.js'),
            "$.bbq": path.resolve(__dirname, 'lib', 'jquery.ba-bbq.js')
        }
    },

    plugins: [
        new webpack.ProvidePlugin({
            jquery: "jquery",
            jQuery: "jquery",
            $: 'jquery'
        })
    ]
}