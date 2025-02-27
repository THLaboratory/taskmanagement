const path = require('path');

module.exports = {
    entry: './src/react_index.jsx',  // React のエントリポイント
    output: {
        path: path.resolve(__dirname, 'build'),  // ビルドされたファイルの保存先
        filename: 'bundle.js',  // 出力される JS の名前
        publicPath: '/',  // ファイルの解決パス
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,   // 扱う拡張子
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env', '@babel/preset-react'],
                    },
                },
            },
        ],
    },
    resolve: {
        extensions: ['.js', '.jsx'],  // import で拡張子を省略可能に
    },
    devServer: {
        static: path.resolve(__dirname, 'build'),  // 開発用のビルドファイルの提供
        compress: true,
        port: 3000,  // ローカルサーバーのポート
        historyApiFallback: true,
    },
};
