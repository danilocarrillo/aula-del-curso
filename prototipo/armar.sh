#!/bin/sh
# Une las tres piezas del prototipo en una sola página: aula-del-curso.html
cd "$(dirname "$0")"
{ cat cascara.html; echo '<script>'; cat reglas.js; echo '</script>'; echo '<script>'; cat app.js; echo '</script>'; } > aula-del-curso.html
echo "Listo: prototipo/aula-del-curso.html"
