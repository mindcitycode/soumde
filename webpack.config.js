var HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const CopyPlugin = require("copy-webpack-plugin");

const config = {
    devtool: "source-map",

    //   entry: "./src/scripts/app.js", //relative to root of the application
    //  output: {
    //     filename: "./dist/app.bundle.js" //relative to root of the application
    plugins: [
        new CopyPlugin({
            patterns: [
    //            { from: "assets", to: "assets" },
                { from: "favicon.ico", to: "favicon.ico" },
            ],
        }),
        new HtmlWebpackPlugin({
            hash: true,
            filename: './index.html', //relative to root of the application,
            title: 'Soumde'
        })
    ],

    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin()],
        //   namedModules: false,
        moduleIds: 'size'
    },

    watchOptions: {
        ignored: /\.#|node_modules|~$/,
    }
}

module.exports = (env, args) => {
    if (args.mode === 'development') {
        delete config.optimization
    } else if (args.mode === 'production') {
        delete config.devtool
    }
    return config
}
/*
const HtmlWebpackPlugin = require('html-webpack-plugin')
module.exports = {
    devtool: "source-map",
    plugins: [
        new HtmlWebpackPlugin({
            title: `ELS`
        })
    ],
    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin()],
        namedModules: false,
        moduleIds : 'size'
    },
    watchOptions: {
        ignored: /\.#|node_modules|~$/,
    }
}*/