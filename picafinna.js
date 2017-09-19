/*!
PicaFinna v1.1.3
https://github.com/haltu/picafinna

Copyright (c) 2016, Haltu Oy
MIT license

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
(function (global, factory) {

  var libName = 'PicaFinna';
  global[libName] = factory(global);

}(this, function (global, undefined) {

  /**
   * Create a new PicaFinna instance.
   *
   * @param {Object} options
   * @public
   * @class
   *
   */
  function PicaFinna (options) {

    var _this = this;
    var opts = options || {};

    this.resultsPerPage = Math.min(opts.resultsPerPage || 15, 100);
    this.currentLang = opts.locale || 'fi';
    this.imageMaxDimensions = opts.imageMaxDimensions || {width: 1200, height: 1200};
    this.zIndex = opts.zIndex || 1000;
    this.document = opts.documentOverride || document;
    this.parentElement = opts.parentElement || this.document.body;
    this.searchDebounceTime = opts.searchDebounceTime || 400;
    this.useJsonp = opts.useJsonp || true;
    this.allowImagePick = opts.allowImagePick !== false;
    this.allowPagePick = opts.allowPagePick !== false;
    this.summaryPreviewMax = opts.summaryPreviewMax || 40;
    this.collectionPreviewMax = opts.collectionPreviewMax || 20;

    this._createPickerDOM();
    this._attachListeners();
    this.resetPicker();

  }

  /**
   * Allow the user to pick an image and call the callback with the results.
   *
   * @param {Function} callback
   * @param {String} optional pre-fill for query
   * @memberof PicaFinna.prototype
   * @public
   * @instance
   *
   */
  PicaFinna.prototype.pickImage = function pickImage (callback, initialQuery) {

    this._imagePickCallback = callback;
    this._searchFieldElement.value = initialQuery || '';
    this._searchApiRequest(this._searchFieldElement.value);
    this.showPicker();

  };

  /**
   * Allow the user to pick an image and call the callback with the results.
   *
   * @param {Function} callback
   * @param {Object} options
   * @memberof PicaFinna
   * @public
   * @static
   *
   */
  PicaFinna.pickImage = function clsPickImage (callback, options) {

    var instance = new PicaFinna(options);

    instance.pickImage(callback, (options || {}).initialQuery);

    return instance;

  };

  /**
   * Cancel the pick action and call the callback with no result.
   *
   * @param {Function} callback
   * @memberof PicaFinna.prototype
   * @public
   * @instance
   *
   */
  PicaFinna.prototype.cancelPick = function cancelPick () {

    this._handleImagePicked();

  };

  /**
   * Make the picker visible.
   *
   * @memberof PicaFinna.prototype
   * @public
   * @instance
   *
   */
  PicaFinna.prototype.showPicker = function showPicker () {

    this.parentElement.appendChild(this._containerElement);
    this._searchFieldElement.select();

  };

  /**
   * Make the picker hidden.
   *
   * @memberof PicaFinna.prototype
   * @public
   * @instance
   *
   */
  PicaFinna.prototype.hidePicker = function hidePicker () {

    try {
      this.parentElement.removeChild(this._detailPageElement);
    }
    catch (e) {}
    try {
      this.parentElement.removeChild(this._containerElement);
    }
    catch (e) {}

  };

  /**
   * Reset existing picker instance to a clean state.
   *
   * @memberof PicaFinna.prototype
   * @public
   * @instance
   *
   */
  PicaFinna.prototype.resetPicker = function resetPicker () {

    this._currentPage = 1;
    this._currentPageCount = 1;
    this._imagePickCallback = noop;
    this._searchFieldElement.value = '';
    this._searchApiRequest();

  };

  /**
   * Move to the given page number, or to the next or previous page.
   *
   * @param {(Number|String)} page number, 'next' or 'prev'
   * @memberof PicaFinna.prototype
   * @private
   * @instance
   *
   */
  PicaFinna.prototype.setPage = function setPage (page) {

    var currentPage = this._currentPage;
    var pageCount = this._currentPageCount;

    if (page == 'prev') {
      page = currentPage - 1;
    }
    else if (page == 'next') {
      page = currentPage + 1;
    }

    page = Math.max(page, 1);
    page = Math.min(page, pageCount);

    this._currentPage = page;
    this._updatePagination();
    this._searchApiRequest(this._searchFieldElement.value, page);

  };

  /**
   * Create picker DOM.
   *
   * @memberof PicaFinna.prototype
   * @private
   * @instance
   *
   */
  PicaFinna.prototype._createPickerDOM = function _createPickerDOM () {
    if (this.parentElement != document.body){
      var containerElement = this._containerElement = this.document.createElement('div');
      containerElement.className = 'picafinna-block';
      containerElement.insertAdjacentHTML('afterbegin', this._getHtmlTemplate(containerElement.className));
    }

    else {
      var containerElement = this._containerElement = this.document.createElement('div');
      containerElement.className = 'picafinna';
      containerElement.style.zIndex = this.zIndex;
      containerElement.insertAdjacentHTML('afterbegin', this._getHtmlTemplate(containerElement.className));
      this._overlayElement = containerElement.querySelector('.picafinna-overlay');
    }
    // Search
    this._searchFieldElement = containerElement.querySelector('.picafinna-search-field');
    this._searchButtonElement = containerElement.querySelector('.picafinna-search-btn');
    this._cancelButtonElement = containerElement.querySelector('.picafinna-cancel-btn');

    // Pagination
    this._paginationTextElements = containerElement.querySelectorAll('.picafinna-pagination-text');
    this._prevPageButtonElements = containerElement.querySelectorAll('.picafinna-prev-page-btn')
    this._nextPageButtonElements = containerElement.querySelectorAll('.picafinna-next-page-btn');

    // Results
    if (this.parentElement != document.body){
      this._resultListElement = containerElement.querySelector('.picafinna-result-list-block');
    }
    else{
      this._resultListElement = containerElement.querySelector('.picafinna-result-list');
    }
    containerElement._setLoadingStatus = function _setLoadingStatus(isLoading) {
      if (this.parentElement != document.body){
        containerElement.className = isLoading ? 'picafinna-block picafinna-loading' : 'picafinna-block';
      }
      else{
        containerElement.className = isLoading ? 'picafinna picafinna-loading' : 'picafinna';
      }
    };

  };

  PicaFinna.prototype._createImageDetailDOM = function _createImageDetailDOM (imageObj) {

    var containerElement = this.document.createElement('div');
    var useImageButton = ''
    var usePageButton = ''
    var imageYear = ''
    var imageCollections = ''
    var imageMeasurements = ''
    var imageSummary = ''

    if (this.allowImagePick) {
      useImageButton = '<button class="picafinna-use-image-btn btn">' + this._localize('Use image') + '</button><div class="picafinna-pagination-text"></div>';
    }
    if (this.allowPagePick) {
      usePageButton = '<button class="picafinna-use-page-btn btn">' + this._localize('Use as material link') + '</button>';
    }
    if (imageObj.year) {
      imageYear = ', ' + imageObj.year;
    }
    if (imageObj.organization) {
      imageOrganization = '<dt>' + this._localize('Organization') + ':' + '</dt>' + '<dd>' + imageObj.organization + '</dd>';
    }
    if (imageObj.collections) {
      imageCollections = '<dt>' + this._localize('Collections') + ':' + '</dt>' + '<dd>' + imageObj.collections + '</dd>';
    }
    if (imageObj.measurements) {
      imageMeasurements = '<dt>' + this._localize('Measurements') + ':' + '</dt>' + '<dd>' + imageObj.measurements + '</dd>';
    }
    if (imageObj.summary) {
      imageSummary = '<p class="picafinna-detail-paragraph">' + imageObj.summary + '</p>';
    }
    containerElement.style.zIndex = this.zIndex + 1;
    containerElement.className = 'picafinna picafinna-detail';
    containerElement.insertAdjacentHTML('afterbegin',
      '<div class="picafinna-outer-wrapper">' +
        '<div class="picafinna-wrapper">' +
          '<span class="picafinna-close-details"><img src="data:image/svg+xml,' + encodeURIComponent(PicaFinna.ARROW_BACK) + '" /></span>' +
          '<div class="picafinna-details-container">' +
            '<div class="picafinna-details-left-side">' +
              '<img class="picafinna-detail-image" src="' + imageObj.url + '"></img>' +
              '<p class="picafinna-detail-image-text">' + imageObj.licenseDescription + '</p>' +
            '</div>' +
            '<div class="picafinna-details-right-side">' +
              '<p class="picafinna-detail-image-text">' + imageObj.formats + imageYear + '</p>' +
              '<h1 class="picafinna-detail-title" title="' + imageObj.title + '"><a href="' + imageObj.pageUrl + '">' + imageObj.title + '</a></h1>' +
                imageSummary +
              '<dl class="picafinna-detail-meta">' +
                imageOrganization +
                imageCollections +
                imageMeasurements +
              '</dl>' +
            '</div>' +
          '</div>' +
          '<div class="picafinna-wrapper-row">' +
            '<div class="picafinna-wrapper-cell">' +
              '<div class="picafinna-divider-horizontal"></div>' +
            '</div>' +
          '</div>' +
          '<div class="picafinna-wrapper-row">' +
            '<div class="picafinna-pagination picafinna-wrapper-cell">' +
              useImageButton +
              usePageButton +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );

    this._closeButtonElement = containerElement.querySelector('.picafinna-close-details');
    this._useImageButton = containerElement.querySelector('.picafinna-use-image-btn');
    this._usePageButton = containerElement.querySelector('.picafinna-use-page-btn');

    this.imageObj = imageObj;

    this.parentElement.appendChild(containerElement);

    this._detailPageElement = containerElement;

    this._attachDetailListeners();

  };

  /**
   * Set loading status of the picker.
   *
   * @param {Boolean} loading status to be set
   * @memberof PicaFinna.prototype
   * @private
   * @instance
   *
   */
  PicaFinna.prototype._setLoadingStatus = function _setLoadingStatus (isLoading) {

    this._containerElement._setLoadingStatus(isLoading);

  };

  /**
   * Create result item DOM.
   *
   * @param {Object} single record object from json response
   * @memberof PicaFinna.prototype
   * @private
   * @instance
   *
   */
  PicaFinna.prototype._createResultItemDOM = function _createResultItemDOM (record) {

    var imageObj = {};
    var resultItemElement = this.document.createElement('div');
    var resultItemWrapper = this.document.createElement('div');
    var resultImageElement = this.document.createElement('img');
    var resultAttributionElement = this.document.createElement('div');
    var resultLinkElement = this.document.createElement('a');
    var imageTitle = record.title;
    var imageUrl = PicaFinna.API_BASE_URL + record.images[0];
    var imagePageUrl = 'https://finna.fi' + record.recordPage;
    var imageBuilding = record.buildings[0].translated;
    var imageFormats = record.formats[0].translated;
    var imageYear = record.year;
    var imageCollections = record.collections;
    var imageMeasurements = record.measurements;
    var imageSummary = record.summary;
    var imageAuthor;
    var imageAttribution;
    var summaryPreviewMax = this.summaryPreviewMax;
    var collectionPreviewMax = this.collectionPreviewMax;
    var collectionString = '';
    var collectionStringPreview = '';
    try {
      imageAuthor = record.authors.main;
    }
    catch(e) {
      imageAuthor = '';
    }

    imageAttribution = imageAuthor;
    imageAttribution += '\n' + record.imageRights.copyright;
    if (record.imageRights.description && record.imageRights.copyright != record.imageRights.description[0]) {
      imageAttribution += ' \u2013 ' + record.imageRights.description[0];
    }
    imageAttribution += '\n' + imageBuilding;

    imageObj.title = imageTitle || '';
    imageObj.url = imageUrl || '';
    imageObj.pageUrl = imagePageUrl || '';
    imageObj.licenseDescription = imageAttribution || '';
    imageObj.organization = imageBuilding || '';
    imageObj.formats = imageFormats || '';
    imageObj.year = imageYear || '';
    imageObj.collections = imageCollections || '';
    imageObj.measurements = imageMeasurements || '';
    imageObj.summary = imageSummary || '';
    imageObj.url = imageObj.url.replace('&fullres=1', '&w=' + this.imageMaxDimensions.width + '&h=' + this.imageMaxDimensions.height);

    if (this.parentElement != document.body){
      return this._getResultItemWrapper(imageSummary, imageObj, summaryPreviewMax, collectionPreviewMax, imageUrl);
    }

    else{
      resultItemElement.className = 'picafinna-result-item';

      resultItemElement.appendChild(resultImageElement);
      resultItemElement.appendChild(resultAttributionElement);
      resultItemElement.style.backgroundImage = 'url(' + imageUrl.replace('(', '%28').replace(')', '%29').replace('&fullres=1', '&w=130&h=130') + ')';

      resultImageElement.className = 'picafinna-result-image';
      resultImageElement.src = imageUrl.replace('&fullres=1', '&w=130&h=130');

      resultAttributionElement.className = 'picafinna-result-attribution';
      resultAttributionElement.setAttribute('title', imageObj.title + ' ' + imageObj.year);
      resultAttributionElement.appendChild(this.document.createTextNode(imageObj.title + ' ' + imageObj.year));
      resultItemElement.addEventListener('click', this._createImageDetailDOM.bind(this, imageObj), true);

      return resultItemElement;
    }
  };

  /**
   * Create status text DOM.
   *
   * @param {String} status text
   * @memberof PicaFinna.prototype
   * @private
   * @instance
   *
   */
  PicaFinna.prototype._createStatusTextDOM = function _createStatusTextDOM (text) {

    var statusTextElement = this.document.createElement('div');

    statusTextElement.className = 'picafinna-result-status';
    statusTextElement.appendChild(this.document.createTextNode(text));

    return statusTextElement;

  };

  /**
   * Update pagination control.
   *
   * @memberof PicaFinna.prototype
   * @private
   * @instance
   *
   */
  PicaFinna.prototype._updatePagination = function _updatePagination () {

    var resultCount = this._currentResultCount;
    var currentPage = this._currentPage;
    var pageCount = Math.ceil(resultCount / this.resultsPerPage);
    var firstResultOnThisPage = Math.min((currentPage - 1) * this.resultsPerPage + 1, resultCount);
    var lastResultOnThisPage = Math.min(currentPage * this.resultsPerPage, resultCount);
    for ( i = 0; i < this._prevPageButtonElements.length; i++){
      this._prevPageButtonElements[i].disabled = (currentPage <= 1) ? true : false;
    }
    for ( i = 0; i < this._nextPageButtonElements.length; i++){
      this._nextPageButtonElements[i].disabled = (currentPage >=pageCount) ? true : false;
    }
    if (resultCount == 0) {
      for ( i = 0; i < this._paginationTextElements.length; i++){
        this._paginationTextElements[i].innerHTML = this._localize('No search results');
      }
    }
    else {
      for ( i = 0; i < this._paginationTextElements.length; i++){
        this._paginationTextElements[i].innerHTML = this._localize('Search results') + ' ' + (firstResultOnThisPage || '-') + ' - ' + (lastResultOnThisPage || '-') + ' / ' + (resultCount || '-');
      }
    }
    this._currentPageCount = pageCount;
  };

  /**
   * Set status text of results.
   *
   * @param {String} status text
   * @memberof PicaFinna.prototype
   * @private
   * @instance
   *
   */
  PicaFinna.prototype._setStatusText = function _setStatusText (text) {

    removeChildren(this._resultListElement);
    this._resultListElement.appendChild(this._createStatusTextDOM(text));

  };

  /**
   * Attach event listeners to picker.
   *
   * @memberof PicaFinna.prototype
   * @private
   * @instance
   *
   */
  PicaFinna.prototype._attachListeners = function _attachListeners () {

    this._debouncedSearchApiRequest = debounce(this._searchApiRequest, this.searchDebounceTime);
    if (this._overlayElement != undefined){
      this._overlayElement.addEventListener('click', this.cancelPick.bind(this), true);
      this._cancelButtonElement.addEventListener('click', this.cancelPick.bind(this), true);
    }

    for (i = 0; i < this._prevPageButtonElements.length; i++){
      this._prevPageButtonElements[i].addEventListener('click', this.setPage.bind(this, 'prev'));
    }
    for (i = 0; i < this._nextPageButtonElements.length; i++){
      this._nextPageButtonElements[i].addEventListener('click', this.setPage.bind(this, 'next'));
    }

    this._searchButtonElement.addEventListener('click', handleSearchButtonClick.bind(this), true);
    this._searchFieldElement.addEventListener('input', handleSearchFieldChanges.bind(this), true);
    this._searchFieldElement.addEventListener('keypress', handleSearchFieldEnter.bind(this), true);
    this._searchFieldElement.addEventListener('keydown', handleSearchFieldEsc.bind(this), true);

    function handleSearchFieldChanges (event) {

      this._debouncedSearchApiRequest(this._searchFieldElement.value);

    }

    function handleSearchButtonClick (event) {

      this._searchApiRequest(this._searchFieldElement.value);

    }

    function handleSearchFieldEnter (event) {

      if (event.which == 13 || event.keyCode == 13) {
        this._searchApiRequest(this._searchFieldElement.value);
      }

    }

    function handleSearchFieldEsc (event) {

      if (event.which == 27 || event.keyCode == 27) {
        this.cancelPick();
      }

    }

  };

  PicaFinna.prototype._attachDetailListeners = function _attachDetailListeners () {

    this._closeButtonElement.addEventListener('click', closeDetailPage.bind(this), true);
    if (this._useImageButton) {
      this._useImageButton.addEventListener('click', this._handleImagePicked.bind(this, this.imageObj), true);
    }
    if (this._usePageButton) {
      this._usePageButton.addEventListener('click', this._handlePagePicked.bind(this, this.imageObj), true);
    }

    function closeDetailPage (event) {

      this.parentElement.removeChild(this._detailPageElement);

    }

  };

  /**
   * Query Finna API and display results.
   *
   * @param {String} query
   * @param {Number} page
   * @memberof PicaFinna.prototype
   * @private
   * @instance
   *
   */
  PicaFinna.prototype._searchApiRequest = function _searchApiRequest (query, page) {

    var responseHandler = this._handleApiResponse.bind(this);
    var request;
    var url;
    var params;

    this._currentPage = page || 1;

    if (query && query.trim()) {
      this._setLoadingStatus(true);

      // Abort previous request if any
      try {
        this._currentApiRequest.abort();
      }
      catch(e) {}

      params = {
        'filter[]': [
          'online_boolean:"1"',
          'usage_rights_str_mv:usage_E'
        ],
        'field[]': [
          'title',
          'imageRights',
          'images',
          'authors',
          'buildings',
          'formats',
          'year',
          'collections',
          'measurements',
          'summary',
          'recordPage'
        ],
        'limit': this.resultsPerPage,
        'page': this._currentPage,
        'lookfor': query
      };
      url = PicaFinna.API_BASE_URL + '/v1/search?' + paramsToQueryString(params);
      if (this.useJsonp) {
        request = jsonpRequest(url, responseHandler);
      }
      else {
        request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.addEventListener('load', function handleLoadEvent () {
          responseHandler(JSON.parse(request.responseText));
        });
        request.send();
      }
      this._currentApiRequest = request;
    }
    else {
      this._currentResultCount = 0;
      this._updatePagination();
      this._setStatusText(this._localize('#introduction-text'));
    }

  };

  /**
   * Handle API query results.
   *
   * @param {Object} json data of response
   * @memberof PicaFinna.prototype
   * @private
   * @instance
   *
   */
  PicaFinna.prototype._handleApiResponse = function _handleApiResponse (data) {

    var pageCount;

    this._setLoadingStatus(false);

    if (data.records) {
      removeChildren(this._resultListElement);
      data.records.forEach(function handleRecord (record) {

        this._resultListElement.appendChild(this._createResultItemDOM(record));

      }, this);
    }
    else {
      this._setStatusText(this._localize('No images matching your query were found.'));
    }

    this._currentResultCount = data.resultCount;
    this._updatePagination();

  };

  /**
   * Return the picked image and clean up.
   *
   * @param {Object} object with picked image details
   * @memberof PicaFinna.prototype
   * @private
   * @instance
   *
   */
  PicaFinna.prototype._handleImagePicked = function _handleImagePicked (imageObj) {

    if (imageObj) {
      imageObj.pageUrl = '';
    }

    if (this._imagePickCallback) {
      this._imagePickCallback(imageObj);
    }

    this.hidePicker();

  };

  PicaFinna.prototype._handlePagePicked = function _handlePagePicked (imageObj) {

    if (imageObj) {
      imageObj.url = '';
    }

    if (this._imagePickCallback) {
      this._imagePickCallback(imageObj);
    }

    this.hidePicker();

  };

  /**
   * Localize a string by key.
   *
   * @param {String} localization key
   * @memberof PicaFinna.prototype
   * @private
   * @instance
   *
   */
  PicaFinna.prototype._localize = function _localize (key) {

    var locale = PicaFinna.locale[this.currentLang] || PicaFinna.locale['en'];

    return locale[key] || key;

  };

  /**
  * Initialize picafinna html elements
  *
  * @param {String} name of parent element (containerElement)
  * @memberof Picafinna.prototype
  * @private
  * @instance
  *
  */
  PicaFinna.prototype._getHtmlTemplate = function _getHtmlTemplate (elemName, pageUrl='', title='',) {

    if (elemName == 'picafinna-block') {
      var htmlElement = '<div class="picafinna-outer-wrapper-block">' +
        '<div class="picafinna-wrapper">' +
          '<div class="picafinna-header picafinna-wrapper-row">' +
            '<div class="picafinna-wrapper">' +
              '<div class="picafinna-wrapper-row-block">' +
                '<div class="picafinna-search-field-wrapper picafinna-wrapper-cell">' +
                  '<input class="picafinna-field picafinna-search-field" type="text" placeholder="' + this._localize('Search query...') + '" />' +
                '</div>' +
                '<div class="picafinna-search-buttons-wrapper picafinna-wrapper-cell">' +
                  '<button class="picafinna-btn picafinna-search-btn btn">' + this._localize('Search') + '</button>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="picafinna-divider-horizontal"></div>' +
          '<div class="picafinna-wrapper-row">' +
            '<div class="picafinna-pagination picafinna-wrapper-cell">' +
              '<div class="picafinna-pagination-wrapper-block">' +
                '<button class="picafinna-prev-page-btn btn">' + this._localize('Previous page') + '</button>' +
                '<div class="picafinna-pagination-text"></div>' +
                '<button class="picafinna-next-page-btn btn">' + this._localize('Next page') + '</button>' +
              '</div>'+
            '</div>' +
          '</div>' +
          '<div class="picafinna-results-block picafinna-wrapper-row-block">' +
            '<div class="picafinna-wrapper-cell">' +
              '<div class="picafinna-result-list-wrapper-block">' +
                '<div class="picafinna-result-list-block">' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="picafinna-wrapper-row">' +
            '<div class="picafinna-pagination picafinna-wrapper-cell">' +
              '<div class="picafinna-pagination-wrapper-block">' +
                '<button class="picafinna-prev-page-btn btn">' + this._localize('Previous page') + '</button>' +
                '<div class="picafinna-pagination-text"></div>' +
                '<button class="picafinna-next-page-btn btn">' + this._localize('Next page') + '</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    }

    else{
      htmlElement = '<div class="picafinna-overlay"></div>' +
        '<div class="picafinna-outer-wrapper">' +
          '<div class="picafinna-wrapper">' +
            '<div class="picafinna-header picafinna-wrapper-row">' +
              '<div class="picafinna-wrapper">' +
                '<div class="picafinna-wrapper-row">' +
                  '<div class="picafinna-logo-wrapper picafinna-wrapper-cell">' +
                    '<a href="https://finna.fi/" target="_blank" class="picafinna-logo-link">' +
                      '<img class="picafinna-logo-image" src="data:image/svg+xml,' + encodeURIComponent(PicaFinna.LOGO_SVG) + '" />' +
                    '</a>' +
                  '</div>' +
                  '<div class="picafinna-search-field-wrapper picafinna-wrapper-cell">' +
                    '<input class="picafinna-field picafinna-search-field" type="text" placeholder="' + this._localize('Search query...') + '" />' +
                  '</div>' +
                  '<div class="picafinna-search-buttons-wrapper picafinna-wrapper-cell">' +
                    '<button class="picafinna-btn picafinna-search-btn btn">' + this._localize('Search') + '</button>' +
                    '<button class="picafinna-btn picafinna-cancel-btn btn">' + this._localize('Cancel') + '</button>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="picafinna-wrapper-row">' +
              '<div class="picafinna-wrapper-cell">' +
                '<div class="picafinna-divider-horizontal"></div>' +
              '</div>' +
            '</div>' +
            '<div class="picafinna-wrapper-row">' +
              '<div class="picafinna-pagination picafinna-wrapper-cell">' +
                '<button class="picafinna-prev-page-btn btn" id="picafinna-prev-page-btn2">' + this._localize('Previous page') + '</button>' +
                '<div class="picafinna-pagination-text" id="picafinna-pagination-text2"></div>' +
                '<button class="picafinna-next-page-btn btn" id="picafinna-next-page-btn2">' + this._localize('Next page') + '</button>' +
              '</div>' +
            '</div>' +
            '<div class="picafinna-results picafinna-wrapper-row">' +
              '<div class="picafinna-wrapper-cell">' +
                '<div class="picafinna-result-list-wrapper">' +
                  '<div class="picafinna-result-list">' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>'
    }

    return htmlElement;
  };

  /**
  * Initialize picafinna html elements
  *
  * @param {String} name of parent element (containerElement)
  * @memberof Picafinna.prototype
  * @private
  * @instance
  *
  */
  PicaFinna.prototype._getDetailHtmlTemplate = function _getDetailHtmlTemplate (pageUrl, title, year, license, summary, summaryPreview, collections, collectionsPreview, organization) {

  var htmlElement = '<div class="picafinna-outer-wrapper-block">' +
    '<a href="' + pageUrl + '" alt="' + title + '">' +
      '<span class="result-item-detail-block result-item-title-block" title="' + title + ', ' + year + '">' + title + ', ' + year + '</span></a>'+
    '<span class="result-item-detail-block result-item-license-block" title="' + license+ '">' + license + '</span>'+
    '<span class="result-item-detail-block result-item-summary-block" title="' + summary + '">' + summaryPreview + '</span>'+
    '<span class="result-item-detail-block result-item-collections-block" title="' + collections + '">' + collectionsPreview + '</span>'+
    '<span class="result-item-detail-block result-item-organization-block" title="' + organization + '">' + organization + '</span>'+
  '</div>';
  return htmlElement;
}

/**
  * Initialize picafinna html elements
  *
  * @param {String} name of parent element (containerElement)
  * @memberof Picafinna.prototype
  * @private
  * @instance
  *
  */
  PicaFinna.prototype._getResultItemWrapper = function _getResultItemWrapper (imageSummary, imageObj, summaryPreviewMax, collectionPreviewMax, imageUrl) {
    var imageSummaryPreview = '';
    var imageCollectionsPreview = '';
    var resultAttributionElement = this.document.createElement('div');
    var resultItemWrapper = this.document.createElement('div');
    var resultItemElement = this.document.createElement('div');
    var resultLinkElement = this.document.createElement('a');
    var resultImageElement = this.document.createElement('img');

      if (imageSummary != undefined){
          imageSummaryPreview = imageSummary.toString();

        if (imageSummaryPreview.length > summaryPreviewMax){
          imageSummaryPreview = imageSummaryPreview.substring(0, summaryPreviewMax);
          imageSummaryPreview = imageSummaryPreview.concat('...');
        }
        else {
          imageSummaryPreview = imageSummary;
        }
      }

      if (imageObj.collections != ""){
        collectionString = imageObj.collections.join(", ");
        if(collectionString.length > collectionPreviewMax){
          collectionStringPreview = collectionString.substring(0, collectionPreviewMax);
          collectionStringPreview = collectionStringPreview.concat('...');
        }
        else{
          collectionStringPreview = collectionString;
        }
      }
      resultAttributionElement.className = 'picafinna-result-attribution-block';
      resultAttributionElement.insertAdjacentHTML('afterbegin', this._getDetailHtmlTemplate(imageObj.pageUrl, imageObj.title, imageObj.year, imageObj.licenseDescription, imageSummary, imageSummaryPreview, collectionString, collectionStringPreview, imageObj.organization));

      resultItemWrapper.className = 'picafinna-result-item-wrapper-block';
      resultItemWrapper.appendChild(resultItemElement);

      resultItemElement.className = 'picafinna-result-item-block';
      resultItemElement.appendChild(resultLinkElement)
      resultItemElement.appendChild(resultAttributionElement);
      resultItemElement.style.backgroundImage = 'url(' + imageUrl.replace('(', '%28').replace(')', '%29').replace('&fullres=1', '&w=130&h=130') + ')';

      resultLinkElement.appendChild(resultImageElement);
      resultLinkElement.href = imageObj.pageUrl;

      resultImageElement.className = 'picafinna-result-image';
      resultImageElement.src = imageUrl.replace('&fullres=1', '&w=130&h=130');

    return resultItemWrapper
  }
  /**
   * Returns a function, that, as long as it continues to be invoked, will not
   * be triggered. The function will be called after it stops being called for
   * N milliseconds. If `immediate` is passed, trigger the function on the
   * leading edge, instead of the trailing.
   * underscore.js | MIT (c) 2009-2016 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
   *
   * @param {Function} function to wrap
   * @param {Number} timeout in ms
   * @param {Boolean} whether to execute at the beginning
   */
  function debounce (func, wait, immediate) {
    var timeout;
    return function () {
      var context = this, args = arguments;
      var later = function () {
        timeout = null;
        if ( ! immediate) {
          func.apply(context, args);
        }
      };
      var callNow = immediate && ! timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) {
        func.apply(context, args);
      }
    };
  }

  function noop () {}

  function removeChildren (element) {

    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }

  }

  function capitalize (str) {

    return str.substr(0, 1).toLocaleUpperCase() + str.substr(1);

  }

  function paramsToQueryString (params) {

    var keys = Object.keys(params);
    var queryString = '';

    keys.forEach(function handleParam (key) {

      var param = params[key];

      if ( ! Array.isArray(param)) {
        param = [param];
      }
      param.forEach(function appendToQueryString (value) {
        queryString += '&' + encodeURIComponent(key) + '=' + encodeURIComponent(value);
      });

    });

    return queryString.substr(1);

  }

  function jsonpRequest (url, callback) {

    var scriptElement = document.createElement('script');
    var callbackFnName = '_jsonpCallback';

    if (global._jsonpRequestCallbackCounter === undefined) {
      global._jsonpRequestCallbackCounter = 0;
    }
    else {
      global._jsonpRequestCallbackCounter += 1;
    }

    callbackFnName += global._jsonpRequestCallbackCounter;
    global[callbackFnName] = function jsonpCallback(data) {

      document.body.removeChild(scriptElement);
      callback(data);

    };

    url += (url.indexOf('?') == -1 ? '?' : '&') + 'callback=' + callbackFnName;

    scriptElement.src = url;
    document.body.appendChild(scriptElement);

    function abort() {

      document.body.removeChild(scriptElement);
      global[callbackFnName] = noop;

    }

    return {
      abort: abort
    };

  }


  PicaFinna.API_BASE_URL = 'https://api.finna.fi';
  PicaFinna.LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 112.2284 136.12848" width="112.23" height="136.13" style="fill: #00a3ad"><path d="M78.53 29.68l-17.07-8.5c-.24-.13-2.44-1.18-5.4-1.18-1.8 0-3.52.4-5.08 1.18l-17.07 8.5c-.2.1-5.46 2.8-5.46 8.83v31.36c0 .25.07 6.14 5.47 8.83L51 87.2c.25.12 2.44 1.17 5.4 1.17 1.8 0 3.52-.4 5.08-1.18l17.07-8.5c.23-.12 5.47-2.8 5.47-8.84V38.5c0-.24-.06-6.13-5.47-8.82m1.24 40.18c0 3.38-3 4.98-3.12 5.04l-17.07 8.5c-.98.5-2.05.73-3.2.73-1.98 0-3.5-.72-3.5-.72l-10.33-5.13 10.27-5.14c.87 1.17 2.26 1.94 3.83 1.94 2.64 0 4.78-2.14 4.78-4.78V55.36l1.24-.6c.53.5 1.24.83 2.03.83 1.6 0 2.93-1.32 2.93-2.93 0-1.62-1.32-2.93-2.93-2.93-1.6 0-2.93 1.3-2.93 2.93v.04l-1.93.98c-.38.2-.62.58-.62 1v11.58c-.46-.3-.96-.5-1.5-.63v-22.3l6.9-3.46c.52.44 1.2.7 1.9.7 1.63 0 2.94-1.3 2.94-2.92 0-1.6-1.3-2.93-2.93-2.93-1.6 0-2.93 1.32-2.93 2.93 0 .07 0 .14.02.2l-7.18 3.62c-.88-1.03-2.18-1.68-3.64-1.68-2.64 0-4.78 2.14-4.78 4.78V59.7l-1.55.77c-.48-.34-1.06-.54-1.7-.54-1.6 0-2.92 1.3-2.92 2.92 0 1.62 1.3 2.93 2.92 2.93 1.62 0 2.93-1.3 2.93-2.93 0-.15 0-.3-.04-.46l1.98-1c.38-.2.62-.58.62-1V48.6c.45.3.96.5 1.5.62v21.9l-11.73 5.87-4.23-2.1c-3.03-1.5-3.12-4.9-3.12-5.04V38.5c0-3.38 3-4.98 3.12-5.03l17.07-8.5c.97-.5 2.05-.73 3.2-.73 1.97 0 3.5.72 3.5.72l17.08 8.5c3.03 1.5 3.12 4.92 3.12 5.05v31.36zm-23.12-2.04c1.37 0 2.47 1.1 2.47 2.47 0 1.35-1.1 2.46-2.47 2.46-1.36 0-2.47-1.1-2.47-2.47 0-1.38 1.1-2.48 2.47-2.48m-1.18-2.15c-.53.13-1.02.35-1.46.64V49.2c.54-.14 1.03-.35 1.47-.65v17.12zm-2.67-18.6c-1.38 0-2.5-1.1-2.5-2.5 0-1.37 1.12-2.5 2.5-2.5s2.5 1.13 2.5 2.5c0 1.4-1.12 2.5-2.5 2.5m10.53 5.6c0-.76.62-1.37 1.37-1.37.75 0 1.37.6 1.37 1.37 0 .75-.62 1.36-1.37 1.36-.75 0-1.37-.6-1.37-1.36m1.84-15.02c0-.75.6-1.36 1.36-1.36.76 0 1.37.6 1.37 1.35 0 .76-.62 1.37-1.37 1.37-.75 0-1.36-.6-1.36-1.37m-19.03 25.2c0 .76-.6 1.37-1.37 1.37-.75 0-1.36-.6-1.36-1.37 0-.75.62-1.36 1.37-1.36.76 0 1.37.6 1.37 1.35" /><path d="M88.3 109.4h-3.06c.5-1.95 1.03-4.14 1.53-6 .5 1.86 1.02 4.05 1.52 6m3.88 5l-4.2-16.5c-.13-.6-.6-1-1.2-1-.62 0-1.1.4-1.22 1l-4.2 16.5c-.2.76.2 1.47.86 1.66.7.2 1.36-.22 1.55-.93.08-.23.13-.52.2-.83l.56-2.16H89c.2.88.42 1.62.56 2.16.07.3.12.6.2.83.2.7.85 1.13 1.56.93.66-.2 1.05-.9.86-1.67m-19.05 1.7c.55-.15.97-.7.97-1.34v-16.5c0-.76-.55-1.36-1.27-1.36-.7 0-1.26.6-1.26 1.37v10.52c-1.13-2.5-2.34-5.25-3.3-7.4-.6-1.3-1.14-2.5-1.67-3.73-.28-.57-.8-.88-1.4-.74-.62.14-1 .68-1 1.34v16.5c0 .75.57 1.35 1.28 1.35.7 0 1.26-.6 1.26-1.36v-10.52c1.08 2.47 2.34 5.23 3.3 7.4.6 1.27 1.14 2.5 1.67 3.7.24.58.82.9 1.43.75m-18.25 0c.55-.15.97-.7.97-1.34v-16.5c0-.76-.55-1.36-1.26-1.36-.7 0-1.27.6-1.27 1.37v10.52c-1.13-2.5-2.34-5.25-3.3-7.4-.6-1.3-1.14-2.5-1.67-3.73-.28-.57-.8-.88-1.42-.74-.6.14-.97.68-.97 1.34v16.5c0 .75.55 1.35 1.26 1.35.7 0 1.26-.6 1.26-1.36v-10.52c1.07 2.47 2.34 5.23 3.3 7.4.6 1.27 1.14 2.5 1.66 3.7.24.58.82.9 1.42.75m-18.53.02c.7 0 1.26-.6 1.26-1.36v-16.5c0-.76-.54-1.36-1.25-1.36-.7 0-1.26.6-1.26 1.37v16.5c0 .75.54 1.35 1.25 1.35m-15.1-.1c.72 0 1.27-.6 1.27-1.38v-7.05H26c.7 0 1.26-.6 1.26-1.37 0-.77-.56-1.37-1.27-1.37H22.5v-5.12h4c.7 0 1.26-.6 1.26-1.36 0-.77-.55-1.37-1.26-1.37h-5.26c-.7 0-1.26.6-1.26 1.38v16.26c0 .77.55 1.37 1.26 1.37" /></svg>';
  PicaFinna.ARROW_BACK = '<svg xmlns="http://www.w3.org/2000/svg" width="35" height="29" style="fill: #000"><path d="M 7.24923,21.750905 -0.00151152,14.451446 7.2727602,7.2257232 C 15.936113,-1.3798106 18,-1.9256431 18,4.3887091 c 0,4.2290091 0.128139,4.4127481 3.521381,5.0493241 3.980666,0.7467778 9.86293,5.4706758 12.029702,9.6607508 C 34.347987,20.639827 35,23.544644 35,25.553932 l 0,3.653252 -3.611091,-3.170579 C 27.394038,22.529061 24.08684,21 20.495266,21 c -2.021004,0 -2.420744,0.557079 -2.684901,3.741683 -0.195263,2.354047 -0.866659,3.846821 -1.810379,4.025182 -0.825008,0.155924 -4.762848,-3.001259 -8.750756,-7.01596 z" /></svg>';
  PicaFinna.locale = {};
  PicaFinna.locale.en = {
    'Search': 'Search',
    'Cancel': 'Cancel',
    'Previous page': 'Previous page',
    'Next page': 'Next page',
    'Search results': 'Search results',
    'No search results': 'No search results',
    'No images matching your query were found.': 'No images matching your query were found.',
    'Search query...': 'Search Finna for word...',
    '#introduction-text': 'Find the relevant images from Finna materials provided by Finnish libraries, archives and museums.'
  };
  PicaFinna.locale.fi = {
    'Search': 'Hae',
    'Cancel': 'Peruuta',
    'Previous page': 'Edellinen sivu',
    'Next page': 'Seuraava sivu',
    'Search results': 'Hakutulokset',
    'No search results': 'Ei hakutuloksia',
    'No images matching your query were found.': 'Hakua vastaavia kuvia ei l\u00F6ytynyt.',
    'Search query...': 'Etsi hakusanalla Finnasta...',
    '#introduction-text': 'L\u00F6yd\u00E4 tarvitsemasi kuvat Finnan kuva-aineistoista. K\u00E4ytett\u00E4viss\u00E4si ovat Suomen museoiden, kirjastojen ja arkistojen aarteet!'
  };


  return PicaFinna;

}));
