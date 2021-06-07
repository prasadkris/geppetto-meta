/**
 * Handles general incoming messages, excluding Simulation
 */

var EventManager = require('@metacell/geppetto-meta-client/common/EventManager').default
function GlobalHandler (GEPPETTO) {

  var messageTypes
        = {
          CLIENT_ID: "client_id",
          ERROR_LOADING_SIM: "error_loading_simulation",
          ERROR_LOADING_PROJECT: "error_loading_project",
          ERROR_DOWNLOADING_MODEL: "error_downloading_model",
          ERROR_DOWNLOADING_RESULTS: "error_downloading_results",
          ERROR: "generic_error",
          INFO_MESSAGE: "info_message",
          GEPPETTO_VERSION: "geppetto_version",
          READ_URL_PARAMS: "read_url_parameters",
          SCRIPT_FETCHED: "script_fetched",
          DATASOURCE_FETCHED: "data_source_results_fetched",
          SERVER_AVAILABLE: "server_available",
          SERVER_UNAVAILABLE: "server_unavailable",
          USER_PRIVILEGES : "user_privileges",
          RECONNECTION_ERROR: "reconnection_error"
        };

  var messageHandler
        = {};

  // sets client id
  messageHandler[messageTypes.CLIENT_ID] = function (payload) {
    GEPPETTO.MessageSocket.setClientID(payload.clientID);
  };

  messageHandler[messageTypes.USER_PRIVILEGES] = function (payload) {
    var user_privileges = JSON.parse(payload.user_privileges);
    GEPPETTO.UserController.setUserPrivileges(user_privileges);
  };

  // Error loading simulation, invalid url or simulation file
  messageHandler[messageTypes.ERROR_LOADING_SIM] = function (payload) {
    EventManager.actionsHandler[EventManager.clientActions.GEPPETTO_ERROR](payload.message);
    GEPPETTO.ModalFactory.infoDialog(GEPPETTO.Resources.INVALID_SIMULATION_FILE, payload.message);
    EventManager.actionsHandler[EventManager.clientActions.HIDE_SPINNER]();
  };

  // Error loading simulation, invalid url or simulation file
  messageHandler[messageTypes.ERROR_LOADING_PROJECT] = function (payload) {
    EventManager.actionsHandler[EventManager.clientActions.GEPPETTO_ERROR](payload.message);
    GEPPETTO.ModalFactory.infoDialog(GEPPETTO.Resources.ERROR_LOADING_PROJECT, payload.message);
    EventManager.actionsHandler[EventManager.clientActions.HIDE_SPINNER]();
  };

  // Error loading simulation, invalid url or simulation file
  messageHandler[messageTypes.ERROR_DOWNLOADING_MODEL] = function (payload) {
    EventManager.actionsHandler[EventManager.clientActions.GEPPETTO_ERROR](payload.message);
    GEPPETTO.ModalFactory.infoDialog(GEPPETTO.Resources.ERROR_DOWNLOADING_MODEL, payload.message);
    EventManager.actionsHandler[EventManager.clientActions.HIDE_SPINNER]();
  };

  // Error loading simulation, invalid url or simulation file
  messageHandler[messageTypes.ERROR_DOWNLOADING_RESULTS] = function (payload) {
    EventManager.actionsHandler[EventManager.clientActions.GEPPETTO_ERROR](payload.message);
    GEPPETTO.ModalFactory.infoDialog(GEPPETTO.Resources.ERROR_DOWNLOADING_RESULTS, payload.message);
    EventManager.actionsHandler[EventManager.clientActions.HIDE_SPINNER]();
  };

  // Error loading simulation, invalid url or simulation file
  messageHandler[messageTypes.INFO_MESSAGE] = function (payload) {
    var message = JSON.parse(payload.message);
    EventManager.actionsHandler[EventManager.clientActions.GEPPETTO_INFO](message);
    GEPPETTO.ModalFactory.infoDialog(GEPPETTO.Resources.INCOMING_MESSAGE, message);
    EventManager.actionsHandler[EventManager.clientActions.HIDE_SPINNER]();
  };

  messageHandler[messageTypes.ERROR] = function (payload) {
    var error = JSON.parse(payload.message);
    EventManager.actionsHandler[EventManager.clientActions.GEPPETTO_ERROR](error.msg);
    GEPPETTO.ModalFactory.errorDialog(GEPPETTO.Resources.ERROR, error.message, error.code, error.exception);
    EventManager.actionsHandler[EventManager.clientActions.HIDE_SPINNER]();
  };

  messageHandler[messageTypes.GEPPETTO_VERSION] = function (payload) {
    var version = payload.geppetto_version;
    var geppettoVersion = GEPPETTO.Resources.GEPPETTO_VERSION_HOLDER.replace("$1", version);
    GEPPETTO.CommandController.log(geppettoVersion);
  };

  messageHandler[messageTypes.SCRIPT_FETCHED] = function (payload) {
    GEPPETTO.ScriptRunner.runScript(payload.script_fetched);
  };

  messageHandler[messageTypes.DATASOURCE_FETCHED] = function (payload) {
    var message = JSON.parse(payload.data_source_results_fetched);
    GEPPETTO.Spotlight.updateDataSourceResults(message.data_source_name,JSON.parse(message.results));
  };

  // Simulation server became available
  messageHandler[messageTypes.SERVER_AVAILABLE] = function (payload) {
    GEPPETTO.ModalFactory.infoDialog(GEPPETTO.Resources.SERVER_AVAILABLE, payload.message);
    EventManager.actionsHandler[EventManager.clientActions.HIDE_SPINNER]();
  };

  messageHandler[messageTypes.RECONNECTION_ERROR] = function (payload) {
    GEPPETTO.ModalFactory.infoDialog(GEPPETTO.Resources.RECONNECTION_ERROR, payload.message);
    GEPPETTO.MessageSocket.SocketStatus = GEPPETTO.Resources.SocketStatus.CLOSE;
    EventManager.actionsHandler[EventManager.clientActions.HIDE_SPINNER]();
    EventManager.actionsHandler[EventManager.clientActions.WEBSOCKET_DISCONNECTED]();
  };

  GEPPETTO.GlobalHandler
        = {
      onMessage: function (parsedServerMessage) {
        if (Object.prototype.hasOwnProperty.call(messageHandler, parsedServerMessage.type)) {
          messageHandler[parsedServerMessage.type](JSON.parse(parsedServerMessage.data));
        }
      }
    };

  GEPPETTO.GlobalHandler.MESSAGE_TYPE = messageTypes;
}

// Compatibility with new imports and old require syntax
GlobalHandler.default = GlobalHandler;
module.exports = GlobalHandler;
