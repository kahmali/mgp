var Packages = module.exports = {};

var _ = require('lodash'),
    fs = require('fs-extra'),
    path = require('path'),
    request = require('request'),
    tar = require('tar'),
    zlib = require('zlib');

var PACKAGE_DIR = process.cwd() + '/packages';

function resolvePath(string) {
  if (string.substr(0, 1) === '~') {
    var homedir = (process.platform.substr(0, 3) === 'win') ? process.env.HOMEPATH : process.env.HOME;
    string = homedir + string.substr(1)
  }
  return path.resolve(string)
}

/**
 * Configure the package directory.
 * @param packageDir The directory to copy the packages to.
 *                             Defaults to cwd/packages
 */
Packages.config = function (packageDir) {
  PACKAGE_DIR = resolvePath(packageDir);
};

/**
 * Load the packages file.
 * @param [file] Defaults to cwd/git-packages.json
 * @param callback
 */
Packages.fromFile = function (file, callback) {
  if (_.isFunction(file)) {
    callback = file;
    file = null;
  }

  var packagesFile = file || process.cwd() + '/git-packages.json';
  fs.readJson(packagesFile, function (err, packages) {
    // XXX check the packages schema
    if (callback) callback(err, packages);
  });
};

/**
 * Create a git ignore in the package directory for the packages.
 * @param definitions
 * @param {Function} callback
 */
Packages.ensureGitIgnore = function (definitions, callback) {
  var filePath = PACKAGE_DIR + '/.gitignore';

  fs.ensureFileSync(filePath);
  fs.readFile(filePath, 'utf8', function (err, gitIgnore) {
    // Append packages to the gitignore
    _.forOwn(definitions, function (definition, key) {
      // Convert colons in package names to underscores for Windows
      if (key === 'token' || gitIgnore.indexOf(key) > -1) return;
      if (isRepoDefinition(definition)) {
        _.forOwn(definition, function (packageDefinition) {
          var packageName = packageDefinition.name;
          packageName = packageName.replace(/:/g, '_');
          gitIgnore += packageName + '\n';
        });
      } else {
        key = key.replace(/:/g, '_');
        gitIgnore += key + '\n';
      }
    });

    fs.writeFile(filePath, gitIgnore, callback);
  });
};

/**
 * Add an entry to the gitignore file
 */

/**
 * Symlink local directories to the packages directory.
 * @param packages The packages to symlink.
 * @param {Function} callback
 */
Packages.link = function (packages, callback) {
  fs.ensureDirSync(PACKAGE_DIR);

  var dirLinked = _.after(_.keys(packages).length, callback);

  _.forOwn(packages, function (def, packageName) {
    if (!def.path || !packageName) return;

    // Convert colons in package names to underscores for Windows
    packageName = packageName.replace(/:/g, '_');
    var dest = PACKAGE_DIR + '/' + packageName;
    fs.removeSync(dest);

    var src = resolvePath(def.path);

    // Type parameter required in windows to create a navigable explorer link
    fs.symlink(src, dest, 'dir', function (error) {
      // Fail explicitly.
      if (error) {
        console.error(error);
        throw 'Could not copy ' + src + ' to ' + dest;
      }

      dirLinked();
    });
  });
};

/**
 * Download the tarballs and copy the packages.
 * @param packages The packages to load.
 * @param {Function} callback
 */
Packages.load = function (packages, callback) {
  fs.ensureDirSync(PACKAGE_DIR);

  // Create a temp directory to store the tarballs
  var tempDir = PACKAGE_DIR + '/temp';
  fs.ensureDirSync(tempDir);

  var tarballs = getTarballDict(packages);

  // Remove the temp directory after the packages are copied.
  var tarballCopied = _.after(_.keys(tarballs).length, function () {
    fs.removeSync(tempDir);
    callback();
  });

  // Load the tarballs from github.
  var headers = {'User-Agent': 'meteor-git-packages tool'};
  if (packages.token) headers.Authorization = 'token ' + packages.token;

  var index = 0;
  _.forOwn(tarballs, function (packagesForTar, tarUrl) {
    var tarballDir = tempDir + '/' + index++;

    request.get({uri: tarUrl, headers: headers})
        .on('error', function (error) {
          throw error;
        })
        .pipe(zlib.Gunzip())
        .pipe(tar.Extract({path: tarballDir, strip: 1}))
        .on('end', function () {
          copyPackages(packagesForTar, tarballDir, tarballCopied);
        });
  });
};

// Create a packages document per tarball url.
// { tarUrl: { packageName: tarPath, .. }, ... }
function getTarballDict (definitions) {
  var tarballs = {};
  _.forOwn(definitions, function (definition, key) {
    if (! definition) return;

    // If this is a repo definition, it will contain a list of package definitions
    var tarball;
    if (isRepoDefinition(definition)) {
      tarball = tarballs[key] = tarballs[key] || {};
      _.forOwn(definition, function (packageDefinition) {
        // package name -> source path inside tarball
        tarball[packageDefinition.name] = packageDefinition.path || '';
      });
    } else {
      // Provide backwards compatibility for all previous versions of API, where definitions were
      // for individual packages
      var url = definition.tarball;
      if (!url) return;

      tarball = tarballs[url] = tarballs[url] || {};
      // package name -> source path inside tarball
      tarball[key] = definition.path || '';
    }
  });

  console.log(tarballs);
  return tarballs;
}

// Copy the packages from the tarball directory to the package path
function copyPackages (packages, tarballDir, done) {
  var packageCopied = _.after(_.keys(packages).length, done);

  _.forOwn(packages, function (src, packageName) {
    src = tarballDir + '/' + src;

    // Convert colons in package names to underscores for Windows
    packageName = packageName.replace(/:/g, '_');
    var dest = PACKAGE_DIR + '/' + packageName;
    fs.removeSync(dest);

    fs.copy(src, dest, function (error) {
      // Fail explicitly.
      if (error) {
        console.error(error);
        throw 'Could not copy ' + src + ' to ' + dest;
      }

      packageCopied();
    });
  });
}

function isRepoDefinition (definition) {
  return _.isArray(definition)
}
