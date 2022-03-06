import BuiltInWordLists from '@/functions/BuiltInWordLists.js';
import Validation from '@/functions/Validation.js';

// Note: all the functions are top-level in this file so that they can reference each other when necessary.
// export default mostly just binds them to exported names for external access.

// Settings handling

function parseStoredInt(val) {
  var parsed = parseInt(val);
  if (isNaN(parsed)) {
    return null;
  }
  return parsed;
}

function parseStoredBool(val) {
  switch (val) {
    case 'true':
      return true;
    case 'false':
      return false;
    default:
      return null;
  }
}

function parseStoredStringCaps(val) {
  return val.toUpperCase();
}

const settings = {
  wordRepetitions: {
    key: 'settings.wordRepetitions',
    parser: parseStoredInt,
    default: 1,
  },
  wordDisplayTime: {
    key: 'settings.wordDisplayTime',
    parser: parseStoredInt,
    default: 0,  // TODO: there may be a better way to store 'no timer' than zero
  },
  wordsPerSession: {
    key: 'settings.wordsPerSession',
    parser: parseStoredInt,
    default: 5,
  },
  assistanceLevel: {
    key: 'settings.assistanceLevel',
    parser: parseStoredStringCaps,
    default: 'MAX',  // potential values: NONE, MIN, MAX
  },
  clickForNextWord: {
    key: 'settings.clickForNextWord',
    parser: parseStoredBool,
    default: true,
  },
  wordDisplayCapitalization: {
    key: 'settings.wordDisplayCapitalization',
    parser: parseStoredStringCaps,
    default: 'UPPERCASE',  // potential values: UPPPERCASE, LOWERCASE
  },
}

function getSetting(name) {
  const setting = settings[name];

  if (localStorage.getItem(setting.key) === null) {
    localStorage.setItem(setting.key, setting.default);
  }

  var storedVal = localStorage.getItem(setting.key);
  return setting.parser(storedVal);
}

function setSetting(name, val) {
  const setting = settings[name];

  localStorage.setItem(setting.key, val);
}

// Custom lists handling

// TODO: the order of lists isn't stable, that's not great
function getCustomListNames() {
  const customListKeys = Object.keys(localStorage)
    .filter(key => key.startsWith('custom_lists.'));
  const customListNames = customListKeys
    .map(key => key.replace(/^custom_lists\./, ''));

  return customListNames;
}

function getCustomList(name) {
  const listKey = 'custom_lists.' + name;

  if (localStorage.getItem(listKey) === null) {
    throw new Error(`not a custom list: "${name}"`);
  }

  const stringData = localStorage.getItem(listKey);
  return JSON.parse(stringData);
}

function getCustomListValidWords(name) {
  var list = getCustomList(name);
  list = list.filter(Validation.isValidWord);
  return list;
}

function createCustomList(name) {
  const listKey = 'custom_lists.' + name;

  if (localStorage.getItem(listKey) !== null) {
    throw new Error(`already a custom list: "${name}"`);
  }

  localStorage.setItem(listKey, '[]');
}

function renameCustomList(oldName, newName) {
  const oldListKey = 'custom_lists.' + oldName;

  if (localStorage.getItem(oldListKey) === null) {
    throw new Error(`not a custom list: "${oldName}"`);
  }

  const newListKey = 'custom_lists.' + newName;

  if (localStorage.getItem(newListKey) !== null) {
    throw new Error(`already a custom list: "${newName}"`);
  }

  const listContents = localStorage.getItem(oldListKey);
  localStorage.setItem(newListKey, listContents);
  localStorage.removeItem(oldListKey);
}

function deleteCustomList(name) {
  const listKey = 'custom_lists.' + name;

  if (localStorage.getItem(listKey) === null) {
    throw new Error(`not a custom list: "${name}"`);
  }

  localStorage.removeItem(listKey);
}

function addCustomWord(listName, word) {
  const listKey = 'custom_lists.' + listName;

  if (localStorage.getItem(listKey) === null) {
    throw new Error(`not a custom list: "${listName}"`);
  }

  const listStringData = localStorage.getItem(listKey);
  let list = JSON.parse(listStringData);

  // we normalize the words to lowercase
  word = word.toLowerCase();

  if (list.includes(word)) {
    // silently don't add the word in twice
    return;
  }

  // add the word and save it to storage
  list.push(word);
  localStorage.setItem(listKey, JSON.stringify(list));
}

function editCustomWord(listName, index, newValue) {
  const listKey = 'custom_lists.' + listName;

  if (localStorage.getItem(listKey) === null) {
    throw new Error(`not a custom list: "${listName}"`);
  }

  const listStringData = localStorage.getItem(listKey);
  let list = JSON.parse(listStringData);

  if (index >= list.length) {
    throw new Error(`index out of bounds: index = "${index}", ${listName}.length = ${list.length}`);
  }

  // we normalize the words to lowercase
  newValue = newValue.toLowerCase();

  list[index] = newValue;
  localStorage.setItem(listKey, JSON.stringify(list));
}

function deleteCustomWord(listName, index) {
  const listKey = 'custom_lists.' + listName;

  if (localStorage.getItem(listKey) === null) {
    throw new Error(`not a custom list: "${listName}"`);
  }

  const listStringData = localStorage.getItem(listKey);
  let list = JSON.parse(listStringData);

  // delete the word and save it to storage
  list.splice(index, 1);
  localStorage.setItem(listKey, JSON.stringify(list));
}

function exportListToJson(listName) {
  const list = getCustomList(listName);  // this can throw errors
  const data = {
    name: listName,
    words: list,
  };
  return JSON.stringify(data);
}

function getParsedDataOrNull(stringData) {
  let data;
  try {
    data = JSON.parse(stringData);
  } catch (e) {
    return null;
  }

  let nameOkay = typeof data.name === 'string';
  let listOkay = Array.isArray(data.words) && data.words.every(x => typeof x === 'string');

  if (!nameOkay || !listOkay) {
    return null;
  }

  return data;
}

function importListFromJson(stringData) {
  const data = getParsedDataOrNull(stringData);

  if (data === null) {
    throw new Error('JSON data is invalid');
  }

  createCustomList(data.name);  // this can throw errors
  for (let word of data.words) {
    addCustomWord(data.name, word);
  }
}

// Selected lists handling

function getSelectedListNames(listType) {
  const key = 'selected_lists.' + listType;

  if (localStorage.getItem(key) === null) {
    // nothing stored means nothing selected
    return [];
  }

  const stringData = localStorage.getItem(key);
  return JSON.parse(stringData);
}

function setListSelected(listType, listName, isSelected) {
  const key = 'selected_lists.' + listType;

  if (localStorage.getItem(key) === null) {
    // initialize storage
    localStorage.setItem(key, '[]');
  }

  const stringData = localStorage.getItem(key);
  let selected = JSON.parse(stringData);

  selected = selected.filter(x => x !== listName);
  if (isSelected) {
    selected.push(listName);
  }

  localStorage.setItem(key, JSON.stringify(selected));
}

export default {
  getSetting: getSetting,
  setSetting: setSetting,

  getCustomListNames: getCustomListNames,
  getCustomList: getCustomList,
  getCustomListValidWords: getCustomListValidWords,
  createCustomList: createCustomList,
  renameCustomList: renameCustomList,
  deleteCustomList: deleteCustomList,
  addCustomWord: addCustomWord,
  editCustomWord: editCustomWord,
  deleteCustomWord: deleteCustomWord,
  exportListToJson: exportListToJson,
  importListFromJson: importListFromJson,

  getSelectedBuiltInListNames: function() {
    // delete any selected lists that don't exist (any more)
    const availableLists = Object.keys(BuiltInWordLists);
    const selectedLists = getSelectedListNames('builtin');
    const deadLists = selectedLists.filter(selectedList => !availableLists.includes(selectedList));
    for (let listName of deadLists) {
      setListSelected('builtin', listName, false);
    }

    return getSelectedListNames('builtin');
  },
  getSelectedCustomListNames: function() {
    // delete any selected lists that don't exist (any more)
    const availableLists = getCustomListNames();
    const selectedLists = getSelectedListNames('custom');
    const deadLists = selectedLists.filter(selectedList => !availableLists.includes(selectedList));
    for (let listName of deadLists) {
      setListSelected('custom', listName, false);
    }

    return getSelectedListNames('custom');
  },
  setBuiltInListSelected: function(listName, isSelected) {
    setListSelected('builtin', listName, isSelected);
  },
  setCustomListSelected: function(listName, isSelected) {
    setListSelected('custom', listName, isSelected);
  },

}
