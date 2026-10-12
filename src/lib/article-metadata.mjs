/**
 * Use the declared publication/edit dates. A source check is not a new edit.
 * The publisher is an Organization; do not invent a personal author identity.
 * @param {{slug:string,title:string,summary:string,datePublished:string,dateModified:string}} guide
 * @param {string} origin
 */
export function articleMetadata(guide, origin='https://howloop.how') {
  const url=new URL('/learn/'+guide.slug+'/',origin).href;
  return {
    '@context':'https://schema.org', '@type':'Article',
    '@id':url+'#article', headline:guide.title, description:guide.summary,
    mainEntityOfPage:{'@type':'WebPage','@id':url},
    author:{'@type':'Organization',name:'Howloop',url:new URL('/about/#publisher',origin).href},
    publisher:{'@type':'Organization',name:'Howloop',url:new URL('/',origin).href},
    datePublished:guide.datePublished, dateModified:guide.dateModified,
  };
}
