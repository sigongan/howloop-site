import en from '../data/languages/en.json';
import zhHans from '../data/languages/zh-hans.json';
import ar from '../data/languages/ar.json';
import vi from '../data/languages/vi.json';
import zhHant from '../data/languages/zh-hant.json';
import pa from '../data/languages/pa.json';
import es from '../data/languages/es.json';
import ko from '../data/languages/ko.json';

// ABS 2021 is the latest released Census population dataset as checked 2026-09-22.
// Chinese script choices are not a proxy for spoken-language identity.
export const LANGUAGES = [
  {code:'en',lang:'en-AU',name:'English',english:'English',dir:'ltr',copy:en},
  {code:'zh-hans',lang:'zh-Hans',name:'简体中文',english:'Chinese · Simplified',dir:'ltr',copy:zhHans},
  {code:'ar',lang:'ar',name:'العربية',english:'Arabic',dir:'rtl',copy:ar},
  {code:'vi',lang:'vi',name:'Tiếng Việt',english:'Vietnamese',dir:'ltr',copy:vi},
  {code:'zh-hant',lang:'zh-Hant',name:'繁體中文',english:'Chinese · Traditional',dir:'ltr',copy:zhHant},
  {code:'pa',lang:'pa-Guru',name:'ਪੰਜਾਬੀ',english:'Punjabi · Gurmukhi',dir:'ltr',copy:pa},
  {code:'es',lang:'es',name:'Español',english:'Spanish',dir:'ltr',copy:es},
  {code:'ko',lang:'ko',name:'한국어',english:'Korean',dir:'ltr',copy:ko},
];
export const languageForPath = path => LANGUAGES.find(item => path.replace(/\/+$/,'') === '/languages/'+item.code);
export const TOOL_IDS = ['compound-interest','mortgage','savings-goal','emergency-fund','salary'];
export const TOOL_DEFAULTS = {
  'compound-interest':{principal:10000,contribution:500,frequency:'monthly',annualRate:4.5,years:10},
  mortgage:{principal:600000,annualRate:6,years:30,offset:30000,extra:200},
  'savings-goal':{principal:15000,target:80000,annualRate:4.5,years:5},
  'emergency-fund':{expenses:3500,months:3,existing:2000,contribution:400},
  salary:{amount:85000,inputPeriod:'annual',includesSuper:false,helpDebt:false,claimThreshold:true,outputPeriod:'fortnightly'},
};
