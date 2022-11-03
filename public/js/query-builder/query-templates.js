/**
 * Query Templates can be defined as object with the fields:
 * > select
 * > body
 * > aggregate
 * 
 * The select is a SPARQL select statement. The body is an array of strings with each string being a line of a 
 * SPARQL query. The string %QUERY% can be used to insert the query generated by the QueryBuilder. The aggregate
 * is a SPARQL aggregate statement.
 */
 class QueryTemplates {

  static DEFAULT_PREFIXES = [
    `PREFIX dataid: <http://dataid.dbpedia.org/ns/core#>`,
    `PREFIX dcv: <http://dataid.dbpedia.org/ns/cv#>`,
    `PREFIX dct:    <http://purl.org/dc/terms/>`,
    `PREFIX dcat:   <http://www.w3.org/ns/dcat#>`,
    `PREFIX rdf:    <http://www.w3.org/1999/02/22-rdf-syntax-ns#>`,
    `PREFIX rdfs:   <http://www.w3.org/2000/01/rdf-schema#>`
  ];


  static COLLECTION_STATISTICS_TEMPLATE = {
    indent: 1,
    prefixes: QueryTemplates.DEFAULT_PREFIXES,
    select: `SELECT DISTINCT ?dataset ?file ?license ?size WHERE`,
    body: [
      `GRAPH ?g`,
      `{`,
      `%QUERY%`,
      `\t?dataset dcat:distribution ?distribution .`,
      `\t?distribution dataid:file ?file .`,
      `\tOPTIONAL { ?dataset dct:license ?license . }`,
      `\tOPTIONAL { ?distribution dcat:byteSize ?size . }`,
      `}`
    ]
  };

  static COLLECTION_FILES_TEMPLATE = {
    prefixes: QueryTemplates.DEFAULT_PREFIXES,
    indent: 1,
    select: `SELECT DISTINCT ?versionUri ?dataset ?distribution ?title ?description (GROUP_CONCAT(DISTINCT ?file; SEPARATOR=", ") AS ?files) ?license ?size ?version ?format (GROUP_CONCAT(DISTINCT ?var; SEPARATOR=', ') AS ?variant) ?preview WHERE`,
    body: [
      `GRAPH ?g`,
      `{`,
      `%QUERY%`,
      `\t?distribution dataid:file ?file .`,
      `\t?distribution dataid:formatExtension ?format .`,
      `\tOPTIONAL { ?distribution ?p  ?var. ?p rdfs:subPropertyOf dataid:contentVariant . }`,
      `\tOPTIONAL { ?dataset dct:license ?license . }`,
      `\tOPTIONAL { ?distribution dcat:byteSize ?size . }`,
      `\tOPTIONAL { ?distribution dataid:preview ?preview . }`,
      `\t?dataset dcat:distribution ?distribution .`,
      `\t?dataset dataid:version ?versionUri .`,
      `\t?dataset dct:hasVersion ?version .`,
      `\t?dataset dct:title ?title .`,
      `\t?dataset dct:description ?description.`,
      `}`
    ],
    aggregate: `GROUP BY ?versionUri ?dataset ?distribution ?title ?description ?license ?size ?version ?format ?preview`
  };

  /**
   * Selects files with additional information for group pages
   */
   static GROUP_PAGE_FILE_BROWSER_TEMPLATE = {
    prefixes: QueryTemplates.DEFAULT_PREFIXES,
    indent: 1,
    select: `SELECT DISTINCT ?file ?version ?artifact ?license ?size ?format ?compression (GROUP_CONCAT(DISTINCT ?var; SEPARATOR=', ') AS ?variant) ?preview WHERE`,
    body: [

      `GRAPH ?g`,
      `{`,
      `%QUERY%`,
      `\t?dataset dcat:distribution ?distribution .`,
      `\t?distribution dataid:file ?file .`,
      `\t?distribution dataid:formatExtension ?format .`,
      `\t?distribution dataid:compression ?compression .`,
      `\t?dataset dct:license ?license .`,
      `\t?dataset dct:hasVersion ?version .`,
      `\t?dataset dataid:artifact ?artifact .`,
      `\tOPTIONAL { ?distribution ?p ?var. ?p rdfs:subPropertyOf dataid:contentVariant . }`,
      `\tOPTIONAL { ?distribution dcat:byteSize ?size . }`,
      `\tOPTIONAL { ?distribution dataid:preview ?preview . }`,
      `}`
    ],
    aggregate: `GROUP BY ?file ?version ?artifact ?license ?size ?format ?compression ?preview`
  };

  /**
   * Selects files with additional information
   */
  static NODE_FILE_TEMPLATE = {
    prefixes: QueryTemplates.DEFAULT_PREFIXES,
    indent: 1,
    select: `SELECT DISTINCT ?file ?license ?size ?format ?compression (GROUP_CONCAT(DISTINCT ?var; SEPARATOR=', ') AS ?variant) ?preview WHERE`,
    body: [

      `GRAPH ?g`,
      `{`,
      `%QUERY%`,
      `\t?dataset dcat:distribution ?distribution .`,
      `\t?distribution dataid:file ?file .`,
      `\t?distribution dataid:formatExtension ?format .`,
      `\t?distribution dataid:compression ?compression .`,
      `\t?dataset dct:license ?license .`,
      `\tOPTIONAL { ?distribution ?p ?var. ?p rdfs:subPropertyOf dataid:contentVariant . }`,
      `\tOPTIONAL { ?distribution dcat:byteSize ?size . }`,
      `\tOPTIONAL { ?distribution dataid:preview ?preview . }`,
      `}`
    ],
    aggregate: `GROUP BY ?file ?license ?size ?format ?compression ?preview`
  };

  /**
   * The default selection (only file)
   */
  static DEFAULT_FILE_TEMPLATE = {
    prefixes: QueryTemplates.DEFAULT_PREFIXES,
    indent: 1,
    select: `SELECT ?file WHERE`,
    body: [
      `GRAPH ?g`,
      `{`,
      `%QUERY%`,
      `\t?dataset dcat:distribution ?distribution .`,
      `\t?distribution dataid:file ?file .`,
      `}`,
    ]
  };

  /**
   * The default selection (only file)
   */
   static CUSTOM_QUERY_FILE_TEMPLATE = {
    prefixes: QueryTemplates.DEFAULT_PREFIXES,
    indent: 1,
    select: `SELECT ?file WHERE`,
    body: [
      `{`,
      `%QUERY%`,
      `}`,
    ]
  };
}

if(typeof module === "object" && module && module.exports)
  module.exports = QueryTemplates;