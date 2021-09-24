
// Controller for the header section
function PublishWizardController($scope, $http, focus, $q) {

  $scope.authenticated = data.auth.authenticated;

  // Test cases:
  // https://www.pik-potsdam.de/members/giannou/sample-output-remind/at_download/file
  // https://data.dnb.de/opendata/?C=M;O=D
  // http://caligraph.org/resources.html
  // https://openenergy-platform.org/ontology/oeo

  $scope.logMeIn = function () {
    window.location = '/login?redirectUrl=' + encodeURIComponent(window.location);
  }

  // controller does not work without authentication
  if (!$scope.authenticated) {
    return;
  }

  // Keys for session saving and loading
  $scope.uploadSessionStorageKey = 'databus_upload';
  $scope.uploadSessionStorageIgnoreKeys = [
    '$$hashKey',
    'eventListeners',
    'hasLocalChanges',
    'fileFilterInput',
    'fileSuggestions',
    'progress',
    'streamQueue'
  ];

  $scope.result = {};

  $scope.watchSession = function () {
    return $scope.$watch('session', function (newVal, oldVal) {
      $scope.session.data.validate();

      if ($scope.session.dataIdCreator != undefined) {
        $scope.result.groupUpdate = $scope.session.dataIdCreator.createGroupUpdate($scope.session.data);
        $scope.result.versionUpdate = $scope.session.dataIdCreator.createVersionUpdate($scope.session.data);
        $scope.result.isReadyForUpload = $scope.checkReadyForUpload();
      }

      $scope.saveSession();
    }, true);
  }

  // Saves the upload session to local storage
  $scope.saveSession = function () {
    try {
      var sessionData = JSON.stringify($scope.session, function (key, value) {
        if ($scope.uploadSessionStorageIgnoreKeys.includes(key)) {
          return undefined;
        }
        return value;
      });

      window.sessionStorage.setItem($scope.uploadSessionStorageKey, sessionData);
    } catch (e) {
      console.log(e);
    }
  }

  $scope.createSignatureData = function () {
    var signature = {};
    signature.publisherUris = [];

    for (var p in data.publisherData) {
      signature.publisherUris.push(data.publisherData[p].publisherUri);
    }

    signature.defaultPublisherUri = `${DATABUS_RESOURCE_BASE_URL}/${data.auth.info.accountName}#this`
    signature.selectedPublisherUri = signature.defaultPublisherUri;
    signature.autoGenerateSignature = true;
    signature.autoGenerateSignatureLocked = false;
    signature.userSignature = '';

    return signature;
  }

  $scope.createNewSession = function () {
    var session = {};
    session.data = new PublishData();
    session.data.validate();
    session.showContext = false;
    session.fetchFilesInput = "";
    session.addFileInput = "";
    session.activeStepIndex = 0;
    session.accountName = data.auth.info.accountName;
    session.isAccountDataLoading = true;
    session.data.signature = $scope.createSignatureData();
    session.dataIdCreator = new DataIdCreator(session.accountName);
    session.shasumClient = new ShasumClient($q, "/system/publish/file?url=", 3);
    $scope.session = session;
    $scope.saveSession();
    window.location.href = window.location.protocol + "//" + window.location.host + window.location.pathname;

  }

  $scope.resumeSession = function () {
    $scope.session = JSON.parse(window.sessionStorage.getItem($scope.uploadSessionStorageKey));

    if ($scope.session == null) {
      return;
    }

    $scope.session.data = new PublishData($scope.session.data);

    var signatureData = $scope.session.data.signature;

    // Update publisher uris
    signatureData.publisherUris = [];
    for (var p in data.publisherData) {
      signatureData.publisherUris.push(data.publisherData[p].publisherUri);
    }

    if (!signatureData.publisherUris.includes(signatureData.selectedPublisherUri)) {
      signatureData.selectedPublisherUri = signatureData.defaultPublisherUri;
    }

    $scope.session.dataIdCreator = new DataIdCreator($scope.session.accountName);
    $scope.session.shasumClient = new ShasumClient($q, "/system/publish/file?url=", 3);
    $scope.session.isPublishing = false;
  }

  // Reload the session from the session storage on reload
  try {

    $scope.resumeSession();

    if ($scope.session != null && $scope.session.isOver) {
      $scope.session = null;
    }

    if ($scope.session != null && $scope.session.accountName != data.auth.info.accountName) {
      $scope.session = null;
    }

  } catch (err) {
    // Any errors lead to a new clean session
    console.log(err);
    $scope.session = null;
  }

  if ($scope.session == null) {
    $scope.createNewSession();
  }

  $scope.stopTheWatch = $scope.watchSession();


  $scope.isWizardReady = false;

  $scope.onSelectPublisher = function (uri) {
    var signature = $scope.session.data.signature;
    signature.selectedPublisherUri = uri;

    var isDefaultUri = signature.defaultPublisherUri == uri;
    signature.autoGenerateSignature = isDefaultUri;
    signature.autoGenerateSignatureLocked = !isDefaultUri;
  }

  $scope.hints = {};

  $scope.hints.files = [
    "Use the file panel to fetch file URLs from resource pages or single file URLs. Fetching the URL verifies that the file is reachable and detects the file format and compression.",
    "Files with the same name but different formats will be grouped and displayed as a single entry in the file panel. Use the arrow button to expand the entry in order to display the detected formats.",
  ];

  $scope.hints.group = [
    "A Databus Group is a structure to help you organize your data artifacts.",
    "If you wanted to upload multiple artifacts about a common topic, a Databus Group provides a way to reflect this commonality.",
    "When uploading artifacts about fish, birds and mammals it would make sense to upload these in a group labelled 'animals'. The web interface only allows uploads to a single group per upload. The group 'general' will be selected by default."
  ];

  $scope.hints.artifact = [
    "A Databus Artifact is a logical dataset on the Databus. It may consist of multiple files in different formats or variants that describe the same thing or topic.",
    "For example, an Artifact labelled <b>Fish</b> could contain three files in different languages. All files would still contain information about fish.",
    "You can update new versions of your Databus Artifact anytime you like. The Artifact identifier remains static and allows users to access all released versions of your data",
  ];

  $scope.hints.variants = [
    "All files of a Databus Artifact have to be distinguishable by more than just the file name. Therefore, each file of an Artifact has to differ in at least one content variant dimension.",
    "For example, if you wanted to upload multiple translations of a text (each in its own file), the Databus would not auto-detect the aspect that makes each file different. You would have to tell the Databus manually that the text files contain the same text in different languages.",
    "You can add content variants to files by adding a content variant dimension (e.g. 'language' or 'lang') and inserting values (e.g. 'en', 'de', 'fr', ...) into the newly created column. "
  ];



  $scope.errorMessages = {
    'err_invalid_group_description': 'The group description is invalid. Please enter at least 25 characters.',
    'err_invalid_group_abstract': 'The group abstract is invalid. Please enter at least 25 characters (plain text).',
    'err_invalid_group_label': 'The group label is invalid. Please enter at least 3 characters.',
    'err_invalid_group_id': 'The group id is invalid. Please enter at least 3 characters.',

    'err_invalid_artifact_id': 'The artifact id is invalid. Please enter at least 3 characters.',
    'err_invalid_artifact_label': 'The artifact label is invalid. Please enter at least 3 characters.',
    'err_invalid_artifact_abstract': 'The artifact abstract is invalid. Please enter at least 25 characters (plain text).',

    'err_invalid_version_id': 'The version id is invalid. Please enter at least 3 characters.',
    'err_invalid_version_description': 'The version documentation is invalid. Please enter at least 25 characters.',
    'err_invalid_version_license': 'The license is invalid. Please enter a license URI.',
    'err_no_files': 'You have to upload at least one file.',
    'err_not_analyzed': 'This file has not been analzyed yet.'

  };





  $scope.setCreateNewGroup = function (value) {

    var group = $scope.session.data.group;

    if (value) {

      group.createNew = true
      group.id = "";
      group.label = "";
      group.abstract = "";
      group.description = "";
      $scope.session.accountGroup = null;
      $scope.setCreateNewArtifact(true);

    } else {
      var hasGroups = DatabusUtils.objSize($scope.session.accountData) > 0;

      if (!hasGroups) {
        $scope.setCreateNewGroup(true);
        return;
      }

      if ($scope.session.accountGroup == null) {
        for (var a in $scope.session.accountData) {
          var targetGroup = $scope.session.accountData[a];
          $scope.selectGroup(targetGroup);
          break;
        }
      }
    }

  }

  $scope.setCreateNewArtifact = function (value) {

    var artifact = $scope.session.data.artifact;

    if (value) {
      artifact.createNew = value;
      artifact.id = "";
      artifact.label = "";
      artifact.abstract = "";
      artifact.description = "";
      $scope.session.accountArtifact = null;

    } else {

      var hasArtifacts = DatabusUtils.objSize($scope.session.accountGroup.artifacts) > 0;

      if (!hasArtifacts) {
        $scope.setCreateNewArtifact(true);
      }

      if ($scope.session.accountArtifact == null) {
        for (a in $scope.session.accountGroup.artifacts) {
          var targetArtifact = $scope.session.accountGroup.artifacts[a];
          $scope.selectArtifact(targetArtifact);
          break;
        }
      }
    }
  }

  $scope.selectArtifact = function (targetArtifact) {
    var artifact = $scope.session.data.artifact;
    artifact.id = targetArtifact.id;
    artifact.label = targetArtifact.label;
    artifact.abstract = targetArtifact.abstract;
    $scope.accountArtifact = targetArtifact;
  }


  $scope.selectGroup = function (targetGroup) {
    var group = $scope.session.data.group;
    var artifact = $scope.session.data.artifact;
    group.id = targetGroup.id;
    group.label = targetGroup.label;
    group.abstract = targetGroup.abstract;
    group.description = targetGroup.description;

    if ($scope.session.accountGroup != targetGroup) {
      $scope.session.accountGroup = targetGroup;
      $scope.session.accountArtifact = null;
      $scope.setCreateNewArtifact(artifact.createNew);
    }
  }

  /**
   * Fetches existing groups and artifacts
   */
  $scope.fetchGroupsAndArtifacts = function () {
    var session = $scope.session;
    var uri = `/system/pages/account/artifacts?account=${encodeURIComponent(session.accountName)}`;

    $http.get(uri).then(function (response) {

      session.isAccountDataLoading = false;
      session.accountData = response.data;

      $scope.setCreateNewGroup(session.data.group.createNew);

      $scope.isWizardReady = true;
    }, function (err) {
      console.log(err);
    });
  }

  $scope.objSize = function (obj) {
    return DatabusUtils.objSize(obj);
  }

  $scope.checkReadyForUpload = function () {

    var group = $scope.session.data.group;
    var artifact = $scope.session.data.artifact;
    var version = $scope.session.data.version;

    if (group.errors.length > 0) {
      return false;
    }

    if (artifact.errors.length > 0) {
      return false;
    }

    if (version.errors.length > 0) {
      return false;
    }

    for (var f in version.files) {
      if (version.files[f].errors.length > 0) {
        return false;
      }
    }


    return true;

  }




  $scope.hasError = function (list, error) {
    for (var i in list) {
      if (list[i] == error) {
        return true;
      }
    }

    return false;
  }

  /**
   * Add a link as a distribution. Doing so will auto-parse the format an compression
   * as content variant
   */
  $scope.addFile = function (input) {

    var session = $scope.session;


    if (input == undefined || input.length == 0) {
      return;
    }

    $http.get('/system/publish/fetch-file?url=' + encodeURIComponent(input)).then(function (response) {

      if (response.data == null || response.data == "" || response.status != 200) {
        return;
      }

      session.data.addFile(response.data);
      $scope.saveSession();

    }, function (err) {

    });
  }

  $scope.analyzeFile = function (file) {
    $scope.session.shasumClient.analyzeFile(file);
  }

  $scope.removeFile = function (fileGroup) {

    var files = $scope.session.data.version.files;
    files.splice(files.findIndex(f => f.uri == fileGroup.uri), 1);
    $scope.session.data.version.isConfigDirty = true;
  }

  // Fetch links using the fetch-links API of the Databus
  $scope.fetchFiles = function (parentUri) {

    $http.get('/system/api/fetch-resource-page?url=' + encodeURIComponent(parentUri)).then(function (response) {

      for (var i in response.data) {
        var uri = response.data[i];
        $scope.addFile(uri);
      }

    }, function (err) {

    });
  }

  $scope.publish = function () {

    var session = $scope.session;
    session.isPublishing = true;
    $scope.runPublishSequence();

  }

  $scope.runPublishSequence = async function () {

    var basePath = DATABUS_RESOURCE_BASE_URL;
    var output = $scope.result;
    output.publishLog = [];
    output.publishLog.push({ hasError: false, message: "Publishing..." });

    var groupId = output.groupUpdate['@graph'][0]['@id'];
    var relativeGroupPath = groupId.replace(basePath, '');

    output.publishLog.push({ hasError: false, message: `Publishing group at ${relativeGroupPath} ...` });
    var result = await $http.put(relativeGroupPath, output.groupUpdate);
    output.publishLog.push({ hasError: false, message: "Done." });

    var versionId = output.versionUpdate['@graph'][0]['version'];
    var relativeVersionPath = versionId.replace(basePath, '');
    output.publishLog.push({ hasError: false, message: `Publishing version at ${relativeVersionPath} ...` });
    result = await $http.put(relativeVersionPath, output.versionUpdate);

    output.publishLog.push({ hasError: false, message: "Done." });

    $scope.session.isPublishing = false;
    $scope.$apply();
  }

  $scope.createUploadResult = function () {

    var session = $scope.session;
    var dataIdCreator = new DataIdCreator();

    var proofType = 'https://databus.dbpedia.org/system/ontology#DatabusTractateV1';

    if (!$scope.autoGenerateSignature) {
      session.data.signature.proof = {
        '@type': [proofType],
        'https://w3id.org/security#signature': [{
          "@type": "http://www.w3.org/2001/XMLSchema#string",
          "@value": session.data.signature.userSignature
        }]
      };
    }

    session.groupUpdate = dataIdCreator.createGroupUpdate(session.accountName, session.data);
    session.versionUpdate = dataIdCreator.createVersionUpdate(session.accountName, session.data);
    session.isReadyForUpload = true;
  }

  /**
   * Callback for the artifact search input (on change). 
   * Refreshes the distribution suggestions
   * @param {*} artifact 
   */
  $scope.onArtifactSearchInputChanged = function (artifact) {
    var input = artifact.fileFilterInput;
    artifact.fileSuggestions = [];

    if (input.length == 0) {
      return;
    }

    artifact.fileSuggestions = [];

    for (var f in $scope.session.fileGroups) {
      var fileGroup = $scope.session.fileGroups[f];

      if (fileGroup.artifactId != undefined) {
        continue;
      }

      if (!fileGroup.name.startsWith(input)) {
        continue;
      }

      artifact.fileSuggestions.push(fileGroup);
    }
  }

  $scope.getArtifact = function (groupId, artifactId) {
    var groups = $scope.session.groups;

    if (groups[groupId] == undefined || groups[groupId].artifacts[artifactId] == undefined) {
      return undefined;
    }

    return groups[groupId].artifacts[artifactId];
  }

  $scope.onBeginAddArtifact = function (group) {
    $scope.addComponentFocus = group.id;
    focus(group.id + '_add_artifact_input')
  }

  $scope.onRemoveDistribution = function (distribution) {
    if (distribution.artifactId != undefined) {
      var artifact = $scope.getArtifact(distribution.groupId, distribution.artifactId);
      $scope.removeDistributionFromArtifact(artifact, distribution);
    } else {
      $scope.distributions = $scope.distributions.filter(function (d) {
        return d.uri != distribution.uri;
      });
    }

    $scope.saveSession();
  }

  $scope.startNewUpload = function () {
    $scope.createNewSession();
  }

  $scope.onShowAddGroupDataDropdown = function (group) {
    $scope.addGroupData.targetGroupId = group.id;
    $scope.addGroupData.mode = 'selectMode';
  }

  $scope.onShowAddArtifactDataDropdown = function (artifact) {
    $scope.addArtifactData.targetGroupId = artifact.groupId;
    $scope.addArtifactData.targetId = artifact.id;
    $scope.addArtifactData.mode = 'selectMode';
  }

  $scope.onRemoveContentVarant = function (variant) {
    var version = $scope.session.version;
    version.contentVariants = version.contentVariants.filter(function (d) {
      return d.id != variant.id;
    });

    for (var f in version.files) {
      var file = version.files[f];
      delete file.contentVariants[variant.id];
    }


    version.isConfigDirty = true;
  }

  $scope.fetchGroupsAndArtifacts();
}



// List of files needs to be transformed into the following structure:

// Group 
  // Artifact
    // Version
      // Dataset
        // Distribution
          // File
          // Format
          // Compression
          // CVs
