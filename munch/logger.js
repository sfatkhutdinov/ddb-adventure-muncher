const logger = require("electron-log");

logger.transports.maxSize = 5242880;
logger.transports.file.maxSize = 20971520;

function clearLogFile(){
  logger.transports.file.getFile().clear();
}

// level: 'error' | 'warn' | 'info' | 'verbose' | 'debug' | 'silly'
function setLogLevel(level = "silly") {
  logger.transports.file.level = level;
}

// Function to redact sensitive information like the cobalt token
function redactSensitiveInfo(message) {
  // Simple redaction for the cobalt token. Assumes the token is a string.
  // More sophisticated redaction might be needed depending on how the token is used.
  if (typeof message === 'string') {
    return message.replace(/cobalt: '[^']*'/g, "cobalt: '[REDACTED]'");
  } else if (typeof message === 'object') {
    // Attempt to deep redact object properties that might contain sensitive info
    const redactedMessage = { ...message };
    if (redactedMessage.data && redactedMessage.data.cobalt) {
      redactedMessage.data.cobalt = '[REDACTED]';
    }
    // Add other potential sensitive fields here if necessary
    return redactedMessage;
  }
  return message;
}

// Wrap logging functions to redact sensitive info
const originalInfo = logger.info;
logger.info = (...args) => {
  originalInfo(...args.map(redactSensitiveInfo));
};

const originalWarn = logger.warn;
logger.warn = (...args) => {
  originalWarn(...args.map(redactSensitiveInfo));
};

const originalError = logger.error;
logger.error = (...args) => {
  originalError(...args.map(redactSensitiveInfo));
};

const originalDebug = logger.debug;
logger.debug = (...args) => {
  originalDebug(...args.map(redactSensitiveInfo));
};

const originalVerbose = logger.verbose;
logger.verbose = (...args) => {
  originalVerbose(...args.map(redactSensitiveInfo));
};

const originalSilly = logger.silly;
logger.silly = (...args) => {
  originalSilly(...args.map(redactSensitiveInfo));
};

exports.clear = clearLogFile;
exports.logger = logger;
exports.info = logger.info;
exports.warn = logger.warn;
exports.error = logger.error;
exports.debug = logger.debug;
exports.verbose = logger.verbose;
exports.silly = logger.silly;
exports.setLogLevel = setLogLevel;
