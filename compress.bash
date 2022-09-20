zipexe='C:/Progra~1/7-Zip/7z.exe'

# clean dist + zip
rm -rf ./dist/
rm -rf ./zip/
mkdir -p zip

# build
npm run build

# zip compress 
"$zipexe" -mx=9 a zip/DIST.zip dist/* | grep size

# minify js online then recompress

# https://javascript-minifier.com/curl
# https://javascript-minifier.com/raw
MINIURI='https://www.toptal.com/developers/javascript-minifier/api/raw'
cd dist
curl -X POST -s --data-urlencode 'input@main.js' "$MINIURI" > main.remin.js
wc main.js
wc main.remin.js
cp main.js ../zip/main.js
cp main.remin.js ../zip/main.remin.js

mv -f main.remin.js main.js 

cd ..
"$zipexe" -mx=9 a zip/DIST.remin.zip dist/* | grep size


ls -hal zip
ls -al zip