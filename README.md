# PicaFinna

A zero-dependency image picker component for image materials in [Finna.fi](https://finna.fi/?lng=en-gb) using the [Finna API](https://www.kiwi.fi/pages/viewpage.action?pageId=53839221).

Browser compatibility IE9+ and modern browsers.

Demo: [haltu.github.io/picafinna](https://haltu.github.io/picafinna/)

## Usage

Include `picafinna.css` and `picafinna.js` in your page.

```html
<link rel="stylesheet" href="picafinna.css" />
<script src="picafinna.js" async></script>
```

Call the picker and get back the details of the image the user selected.

```javascript
PicaFinna.pickImage(function handleResult (imageObj) {
  console.log(imageObj);
  // { title: '...', url: '...', pageUrl: '...', licenseDescription: '...' }
});
```

You can also get a new instance of PicaFinna for custom options.

```javascript
var picker = new PicaFinna({
  zIndex: 10000,
  locale: 'en'
});

// Prevent parent element from scrolling
document.body.style.overflow = 'hidden';

picker.pickImage(function handleResult (imageObj) {
  console.log(imageObj);
  document.body.style.overflow = '';
});
```

## Options

* **`zIndex`** &nbsp;&mdash;&nbsp; *Number*
  * Default value: `1000`.
  * zIndex of the main element in modal mode.
* **`imageMaxDimensions`** &nbsp;&mdash;&nbsp; *Object*
  * Default value: `{width: 1200, height: 1200}`.
  * Maximum dimensions for the returned image.
* **`locale`** &nbsp;&mdash;&nbsp; *String*
  * Default value: `'fi'`.
  * Choices: `'fi'`, `'en'`.
  * Language of the picker UI. Image details, for example license descriptions, will still be in Finnish.
* **`parentElement`** &nbsp;&mdash;&nbsp; *Element*
  * Default value: `document.body`.
  * Override the parent element for the picker. Can be useful if you are implementing a custom inline picker.
* **`documentOverride`** &nbsp;&mdash;&nbsp; *Document*
  * Default value: `document`.
  * Override the document object for the picker.
* **`resultsPerPage`** &nbsp;&mdash;&nbsp; *Number*
  * Default value: `15`.
  * Allowed values: `0 - 100`.
  * Search results to show per page.
* **`searchDebounceTime`** &nbsp;&mdash;&nbsp; *Number*
  * Default value: `400`.
  * The duration before the search is triggered after typing into the search field.
* **`useJsonp`** &nbsp;&mdash;&nbsp; *Boolean*
  * Default value: `true`.
  * If `true` JSONP is used instead of `XMLHttpRequest`. Currently the API does not support CORS.


## Methods

### `picker.pickImage( callback, initialQuery )`

Allow the user to pick an image and call the callback with the results.

**Parameters**

* **callback** &nbsp;&mdash;&nbsp; *function*
* **initialQuery** &nbsp;&mdash;&nbsp; *string*
  * Optional.

**Callback parameters**

* **imageObj** &nbsp;&mdash;&nbsp; *object*
  * Properties:
    * title &nbsp;&mdash;&nbsp; Title of the image
    * url &nbsp;&mdash;&nbsp; URL to the image file
    * pageUrl &nbsp;&mdash;&nbsp; URL to detail page
    * licenseDescription &nbsp;&mdash;&nbsp; License information

**Examples**

```javascript
picker.pickImage(handleResult, 'kissa');
function handleResult (imageObj) {
  console.log(imageObj);
  // { title: '...', url: '...', pageUrl: '...', licenseDescription: '...' }
}
```


### `PicaFinna.pickImage( callback, options )`

Create a new instance with `options` and call `pickImage` on it. `initialQuery` can be passed as an option.

**Parameters**

* **callback** &nbsp;&mdash;&nbsp; *function*
* **options** &nbsp;&mdash;&nbsp; *object*
  * Optional.

**Callback parameters**

* **imageObj** &nbsp;&mdash;&nbsp; *object*
  * Properties:
    * title &nbsp;&mdash;&nbsp; Title of the image
    * url &nbsp;&mdash;&nbsp; URL to the image file
    * pageUrl &nbsp;&mdash;&nbsp; URL to detail page
    * licenseDescription &nbsp;&mdash;&nbsp; License information

**Examples**

```javascript
PicaFinna.pickImage(handleResult, {initialQuery: 'kissa'});
function handleResult (imageObj) {
  console.log(imageObj);
  // { title: '...', url: '...', pageUrl: '...', licenseDescription: '...' }
}
```


### `picker.cancelPick()`

Cancel the pick action and call the callback with no result.

**Examples**

```javascript
picker.cancelPick();
```


### `picker.showPicker()`

Make the picker visible.

**Examples**

```javascript
picker.showPicker();
```


### `picker.hidePicker()`

Make the picker hidden.

**Examples**

```javascript
picker.hidePicker();
```


### `picker.resetPicker()`

Reset existing picker instance to a clean state.

**Examples**

```javascript
picker.resetPicker();
```


### `picker.setPage( page )`

Move to the given page number, or to the next or previous page.

**Parameters**

* **page** &nbsp;&mdash;&nbsp; *number / 'next' / 'prev'*

**Examples**

```javascript
picker.setPage('next');
```


## License

Copyright &copy; 2016 Haltu Oy. Licensed under **[the MIT license](LICENSE.md)**.
