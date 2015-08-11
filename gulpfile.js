var gulp = require('gulp');
var babel = require('gulp-babel');
var del = require('del');
var runSequence = require('run-sequence');
var eslint = require('gulp-eslint');
var chalk = require('chalk');

var config = {
	es6files: ['src/**/*.js', 'src/*.js', '!src/node_modules/**/*.js'],
	watchFiles: ['src/**/*.{js,hbs}', 'src/*.{js,hbs}', '!src/node_modules/**/*.js'],
	outPath: 'dist',
	resourcesPath: ['src/*_modules/**', 'src/*emplates/**', 'src/package.json']
};

gulp.task('_clean', function(cb) {
	del(config.outPath, cb);
});

gulp.task('_transpile', function() {
	return gulp.src(config.es6files)
		.pipe(babel())
		.pipe(gulp.dest(config.outPath));
});

gulp.task('_copyResources', function() {
	return gulp.src(config.resourcesPath)
		.pipe(gulp.dest(config.outPath));
});

gulp.task('lint', function () {
	return gulp.src(config.es6files)
		.pipe(eslint())
		.pipe(eslint.format());
});

gulp.task('default', function(callback) {
	console.log(chalk.blue('Watcher started, will rebuild when files change'));
	gulp.watch(config.watchFiles, function () {
			runSequence(
				'_clean',
				'_transpile',
				'_copyResources',
				callback);
		}
	);
});
