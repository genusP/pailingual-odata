const path = require('path');

module.exports = (env, argv) => {
    return {
        entry: path.join(__dirname, "/src/index.ts"),
        context: path.join(__dirname, "/src"),
        devtool: false,
        output: {
            path: __dirname + "/dist",
            filename: "pailingual.js",
            libraryTarget: "umd",
            library: "pailingual-odata"
        },
        module: {
            rules: [
                { test: /\.ts$/, include: /src/, use: { loader: 'awesome-typescript-loader', options: { target: "es5", sourceMap: false, module:"es6" } } }
            ]
        },
        resolve: {
            extensions: [".ts"]
        }
    };
};