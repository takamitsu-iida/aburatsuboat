module.exports = function (grunt) {
  var pkg = grunt.file.readJSON('package.json');

  grunt.file.defaultEncoding = 'utf-8';
  grunt.file.preserveBOM = true;

  grunt.initConfig({
    concat: {
      target_js: {
        // 元ファイルの指定
        src: [
          'static/site/js/aburatsuboat.startup.js',
          'static/site/js/aburatsuboat.slider.js',
          'static/site/js/aburatsuboat.geodata.miura.js',
          'static/site/js/aburatsuboat.geodata.landmark.js',
          'static/site/js/aburatsuboat.tideChart.js',
          'static/site/js/aburatsuboat.mapChart.js'
          ],
        // 出力ファイルの指定
        dest: 'static/site/dist/aburatsuboat.js'
      },
      target_css: {
        src: [
          'static/site/css/aburatsuboat.mapChart.css',
          'static/site/css/aburatsuboat.slider.css'
          ],
        dest: 'static/site/dist/aburatsuboat.css'
      }
    },

    uglify: {
      target_js: {
        files: {
          // 出力ファイル: 元ファイル
          'static/site/dist/aburatsuboat-min.js': ['static/site/dist/aburatsuboat.js']
        }
      }
    }
  });

  // プラグインのロード・デフォルトタスクの登録
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.registerTask('default', ['concat', 'uglify']);
};
