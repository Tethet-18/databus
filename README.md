# Databus (BETA)

## Deployment

In order to build and run the On-Premise Databus Application you will need `npm`, `docker` and `docker-compose` installed on your machine.
* `npm`: 7.24.0 or higher
* `docker`: 20.10.2 or higher
* `docker-compose`: 1.25.0 or higher

### Building the Docker Image

```
git clone https://github.com/dbpedia/databus.git
cd databus-beta
bash install.sh
```

The `install.sh` script will install all npm dependencies for the server and webclient and build the docker image for the Databus application.

### Redeploying a new Beta Version

```
bash restart.sh
```

### Basic Configuration

Configure your Databus installation by changing the values in the `.env` file in the root directory of the repository. The following values can be configured:

* **DATABUS_RESOURCE_BASE_URL**: The base resource URL. All Databus resources will start with this URL prefix. Make sure that it matches the DNS entry pointing to your Databus server so that HTTP requests on the resource identifiers will point to your Databus deployment.
* **DATABUS_OIDC_ISSUER_BASE_URL**: Base URL of your OIDC provider
* **DATABUS_OIDC_CLIENT_ID**: Client Id of your OIDC client
* **DATABUS_OIDC_SECTRET**: Client Secret of your OIDC client
* **VIRTUOSO_USER**: A virtuoso database user with write access (SPARQL_UPDATE)
* **VIRTUOSO_PASSWORD**: The password of the VIRTUOSO_USER account

### Starting the Databus Server

```
docker-compose up
```


### Advanced Configuration

The configuration can be adjusted by modifying the docker-compose.yml file directly. The compose file starts 3 docker containers.

#### Databus Container

The Databus container holds the Databus server application (port 3000) and search API (port 8080). The internal ports can be mapped to an outside port using the docker-compose port settings. Mapping the port of the search API is optional.

The Databus container accepts the following environment variables:
* DATABUS_RESOURCE_BASE_URL: The base resource URL. All Databus resources will start with this URL prefix. Make sure that it matches the DNS entry pointing to your Databus server so that HTTP requests on the resource identifiers will point to your Databus deployment.
* DATABUS_DATABASE_URL: The URL of your GStore database. Can be left as is. Change this only if you want to host your database elsewhere and you know what you are doing.
* DATABUS_OIDC_ISSUER_BASE_URL: Base URL of your OIDC provider
* DATABUS_OIDC_CLIENT_ID: Client Id of your OIDC client
* DATABUS_OIDC_SECTRET: Client Secret of your OIDC client

The volumes of the Databus container are best left unchanged. The internal path of the volumes should not be altered. The ourside paths may be changed to any desired path. The keypair folder will store the private and public key of your Databus deployment. The users folder will hold a mini-database associating your OIDC users with Databus users.

#### GStore Container

The GStore is a git-repository / triple store hybrid database. It stores chunks of RDF data both as files in a git repository and graphs in a triple store. This allows rollback of commits AND sending of SPARQL queries. The default GStore configuration operates with an internal git repository (can be changed to an external repository, please refer to the GStore documentation) and a Virtuoso triple store. 

The GStore Container accepts the following environment variables:
* VIRT_USER: The admin user of your virtuoso deployment
* VIRT_PASS: The admin password of your virtuoso deployment
* VIRT_URI: The uri of the virtuoso deployment. Keep this as is unless you want to host your virtuoso triple store elsewhere.

#### Virtuoso Container

The Virtuoso container is the triple store database.

The Virtuoso Container accepts the following environment variables:
* DBA_PASSWORD: Admin password
* SPARQL_UPDATE: Needs to be set to true to allow updates
* DEFAULT_GRAPH: Set this to your DATABUS_RESOURCE_BASE_URL setting


Example:

```
version: "3.0"
services:
  databus:
    image: databus
    ports:
      - 3000:3000 
      - 3001:8080 # exposes search
    environment: 
      DATABUS_RESOURCE_BASE_URL: ${DATABUS_RESOURCE_BASE_URL}
      DATABUS_DATABASE_URL: http://172.17.0.01:3002
      DATABUS_OIDC_ISSUER_BASE_URL: ${DATABUS_OIDC_ISSUER_BASE_URL}
      DATABUS_OIDC_CLIENT_ID: ${DATABUS_OIDC_CLIENT_ID}
      DATABUS_OIDC_SECRET: ${DATABUS_OIDC_SECRET}
    volumes:
      - ./data/keypair/:/databus/server/keypair
      - ./data/users/:/databus/server/users
  gstore:
    image: "dbpedia/gstore"
    environment: 
      VIRT_USER: ${VIRTUOSO_USER}
      VIRT_PASS: ${VIRTUOSO_PASSWORD}
      VIRT_URI: "http://172.17.0.01:3003"
      GIT_ROOT: "/root/git"
    ports:
      - "3002:80"
    volumes:
      - ./data/repo:/root/git
  virtuoso:
    image: "openlink/virtuoso-opensource-7"
    environment:
      DBA_PASSWORD: ${VIRTUOSO_PASSWORD}
      SPARQL_UPDATE: "true"
      DEFAULT_GRAPH: ${DATABUS_RESOURCE_BASE_URL}
    ports:
      - "3003:8890"
    volumes:
      - ./data/virtuoso:/database
```

## Authentication

### Client Configuration

Follow the documentation of your OIDC provider to configure a client. Connect the client to the deployed Databus instance by setting the following environment variables on Datbaus startup:

* DATABUS_OIDC_ISSUER_BASE_URL: The base URL of your OIDC provider
* DATABUS_OIDC_CLIENT_ID: The client id of the configured client at the OIDC provider
* DATABUS_OIDC_SECRET: the client secret of the configured client at the OIDC provider

When configuring the client at the OIDC provider, you will be most likely asked to specify a callback URI for redirects after a login. The callback values need to be set to the following values:

**Callback**
`https://databus.example.org/system/callback`

**Logout**
`https://databus.example.org/system/logout`

**Login**
`https://databus.example.org/system/login`

### OIDC Providers 

Tested OIDC providers: Keycloak, Auth0, Microsoft Azure

### Creating an API Token

Once the Databus has been started with the correct configuration, you can use the login button on the web interface to log in to your OIDC provider account. Once you are successfully logged in, you can navigate to your account page by using the 'My Account' button on the landing page or using the dropdown in the upper right corner of the screen.

You will be asked to specify a namespace. Choose this namespace carefully, as it will be visible in all your databus URIs. The namespace can only be changed by an admin later.

Navigate to the settings tab on your account page and scroll to the 'API Keys' section. Enter a display name for your API key (this is only for better distinguishability) and click 'Create' to create the key. You can use the copy icon on the API key to copy the key value to your clipboard.

Use any API key in the `X-Api-Token` header of your API calls to authenticate yourself.

## Databus API

The following examples of the API usage use a non-existing example databus at `https://databus.example.org`. The user performing the requests will be John who is using the namespace `john`. John has already created an API token on his account page with a value of `27b29848-69c6-4eaf`.


### Accounts

Account data can be changed via `PUT` or `DELETE` request. It is however recommended to use the web interface for these actions.
* The request uri is the path of your account. 
* The `X-Api-Token` header needs to specify a valid API token. 
* The `Content-Type` header needs to be set to the content type of your data. 
* The supplied data needs to conform to these [SHACL shapes](./server/app/common/shacl/account-shacl.ttl)

### Groups

You can add, change and remove groups. The actions are invoked by using the corresponding http request method `PUT` and `DELETE`. The request uri is the path of your Databus Group. The `X-Api-Token` header needs to specify a valid API token. The `Content-Type` header needs to be set to the content type of your data. The supplied data needs to conform to these [SHACL shapes](./server/app/common/shacl/group-shacl.ttl)


**ADDITIONALLY:** 
* The uri of the dataid:Group has to match the request uri. 
* The uri path must start with the username of the issuing user (identified by the API token).



#### Example:
John wants to create the group `general` to later publish some of his artifacts. He issues the following `PUT` request:

```
curl -X PUT -H "Content-Type: application/json" -H "X-Api-Token: 27b29848-69c6-4eaf" -d "./group.jsonld" https://databus.example.org/john/general
```

The contents of the file `./group.jsonld` are the following:

```
{
  "@id": "https://databus.example.org/john/general",
  "@type": "http://dataid.dbpedia.org/ns/core#Group",
  "http://purl.org/dc/terms/title": {
    "@value": "General",
    "@language": "en"
  },
  "http://purl.org/dc/terms/abstract": {
    "@value": "General artifacts.",
    "@language": "en"
  },
  "http://purl.org/dc/terms/description": {
    "@value": "This group contains various general artifacts.",
    "@language": "en"
  }
}
```

Note that the *@id* of the supplied graph has to be the same as the request uri. Additionally, the uri has to be in John's namespace `john`.

### Artifact Versions

Databus artifacts are created implicitly by creating a version of an artifact. You can add, change and remove groups. The actions are invoked by using the corresponding http request method `PUT`, `PATCH` and `DELETE`. The request uri is the path of your Databus Group. The `X-Api-Token` header needs to specify a valid API token. The `Content-Type` header needs to be set to the content type of your data. The supplied data needs to conform to the following SHACL shapes

#### Creating / Modifying an Artifact Version

```http
PUT -d $data /$username/$group/$artifact/$version
```

| Header | Value |
| :--- | :--- | 
| X-Api-Token | **Required** Your Databus API Key |
| Content-Type | **Required** application/json | 


| Parameter | Description |
| :--- | :--- | 
| `$username` | Your Databus username |
| `$group` | The group identifier for your artifact version |
| `$artifact` | The artifact identifier for your artifact version |
| `$version` | The version identifier for your artifact version |
| `$data` | The DataId of the artifact version. The format specs are documented below. |

*Data Format Specification*
* The `$data` must be supplied as JSON-LD 
* The `$data` must conform to these [SHACL shapes](./server/app/common/shacl/dataid-shacl.ttl)

| Status Codes | Status | Description |
| :--- | :--- | :--- | 
| 200 | `OK` | Artifact version updated |
| 201 | `CREATED` | Artifact version created | 
| 400 | `BAD REQUEST` | Request or request data was formatted incorrectly | 
| 403 | `FORBIDDEN` | Invalid API Token or request targetting the namespace of another user | 
| 500 | `INTERNAL SERVER ERROR` | Internal server error | 

#### Removing an Artifact Version

```http
DELETE /$username/$group/$artifact/$version
```

| Header | Value |
| :--- | :--- | 
| X-Api-Token | **Required** Your Databus API Key |

| Status Codes | Status | Description |
| :--- | :--- | :--- | 
| 204 | `NO CONTENT` | Artifact version deleted successfully |
| 403 | `FORBIDDEN` | Invalid API Token or request targetting the namespace of another user | 
| 500 | `INTERNAL SERVER ERROR` | Internal server error | 
