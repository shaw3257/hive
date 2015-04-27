module.exports = function(grunt){
  require('load-grunt-tasks')(grunt);
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.initConfig({
    sass: {
      options: {
        sourceMap: false
      },
      dist: {
        files: {
          'app/build/hive.css': 'app/assets/stylesheets/hive.scss',
          'app/build/reset.css': 'app/assets/stylesheets/reset.scss'
        }
      }
    },
    browserify: {
      ui: {
        files: {
          'app/build/application.js': ['app/assets/javascripts/main.js']
        }
      },
      ai: {
        files: {
          'app/public/ai.js': ['app/assets/javascripts/workers/ai-worker.js']
        }
      }
    },
    concat: {
      css: {
        src: ['app/build/reset.css', 'node_modules/material-design-lite/material.css', 'app/build/hive.css'],
        dest: 'app/public/application.css',
      },
      js: {
        src: ['app/build/application.js', 'node_modules/material-design-lite/material.js'],
        dest: 'app/public/application.js',
      },
    },
    copy: {
      main: {
        files: [ {expand: true, src: ['app/assets/images/*'], dest: 'app/public/images', flatten: true, filter: 'isFile'} ]
      }
    },
    clean: {
      build: ['app/build'],
      dist: ['app/public']
    },
    watch: {
      css: {
        files: ['app/assets/stylesheets/*.scss'],
        tasks: ['sass', 'concat:css', 'clean:build'],
        options: {
          livereload: true,
        }
      },
      js: {
        files: ['lib/*.js', 'app/assets/javascripts/**/*.js'],
        tasks: ['browserify', 'concat:js', 'clean:build']
      }
    }
  });

  grunt.registerTask('default', ['clean', 'sass', 'browserify', 'concat', 'copy', 'clean:build']);

}