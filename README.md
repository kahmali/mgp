# Meteor Git Packages [![Build Status](https://travis-ci.org/DispatchMe/mgp.svg?branch=master)](https://travis-ci.org/DispatchMe/mgp)

This tools helps you share private meteor packages.

## Getting Started

- `npm install -g mgp`

- Add `git-packages.json` to the root of your project and [generate](https://github.com/settings/applications#personal-access-tokens) a token for private tarball access.

It is becoming fairly common to have multiple meteor packages stored in a single repository. In favor of keeping the config file a little more DRY, you can define multiple packages under a single tarball URL:

```js
{
  // Define a list of packages under a single repo
  "https://api.github.com/repos/my/private-packages/tarball/commithash": [
    {
      "name": "my:first-package-in-repo",
      "path": "path/to/first/package/directory"
    },
    {
      "name": "my:second-package-in-repo",
      "path": "path/to/second/package/directory"
    }
  ],
  "token": "GITHUB_ACCESS_TOKEN"
}
```

In the interest of backwards compatibility, you can still define packages individually:

````
{
  "my:private-package": {
    "tarball": "https://api.github.com/repos/my/private-packages/tarball/commithash",
    "path": "optional/directory/path"
  },
  "my:other-private-package": {
    "tarball": "https://api.github.com/repos/my/private-packages/tarball/commithash"
  },
  "token": "GITHUB_ACCESS_TOKEN"
}
````

And of course, you can mix the two styles together if that's how you roll:

```js
{
  // The typical way of defining a repo with a single Meteor package
  "my:private-package": {
    "tarball": "https://api.github.com/repos/my/private-packages/tarball/commithash",
    "path": "optional/directory/path"
  },
  "my:other-private-package": {
    "tarball": "https://api.github.com/repos/my/private-packages/tarball/commithash"
  },
  // Define a list of packages under a single repo
  "https://api.github.com/repos/my/private-packages/tarball/commithash": [
    {
      "name": "my:first-package-in-repo",
      "path": "path/to/first/package/directory"
    },
    {
      "name": "my:second-package-in-repo",
      "path": "path/to/second/package/directory"
    }
  ],
  "token": "GITHUB_ACCESS_TOKEN"
}
```

- Run `mgp` in your meteor directory to copy the packages from github or `mgp my:private-package` to copy an individual package.

or

- Add `local-packages.json` to the root of your project:

````
{
  "my:private-package": {
    "path": "~/path/to/private-package"
  },
  "my:other-private-package": {
    "path": "relative/path/to/other-private-package"
  }
}
````

- Run `mgp link` in your meteor directory to symlink your local packages or `mgp link my:private-package` to symlink an individual package.
