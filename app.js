var express = require('express');
var session = require('express-session');
var mongoose = require('mongoose');
var MongoStore = require('connect-mongo')(session);
var passport = require('passport');
var LdapAuth = require('passport-ldapauth');

var favicon = require('serve-favicon');
var flash = require('connect-flash');
var winston = require('winston');
var multer = require('multer');
var morgan = require('morgan');
var http = require('http');
var path = require('path');

var config = require('./config');
var pkg = require('./package');
var Account = require('./models/account');

// Logging
winston.loggers.add('log', config.loggers.log);
var log = winston.loggers.get('log');
log.exitOnError = false;

// Configure Express
var app = express();
var mltr = multer();
app.set('port', process.env.PORT || config.app.set.port);
app.set('address', process.env.ADDRESS || config.app.set.address);
app.set('env', process.argv[2] || process.env.NODE_ENV || config.env);

app.set('views', path.join(__dirname, config.app.set.views));
app.set('view engine', config.app.set.engine);
app.set('view options', config.app.set.options);

app.use(favicon(path.join(__dirname, config.app.set.favicon)));

// Request logger status codes
morgan.token('locale', function () {
  'use strict';
  return new Date().toISOString().substr(0, 11) + new Date().toLocaleTimeString();
});

morgan.token('info', function () {
  'use strict';
  return '\x1b[32minfo\x1b[0m:';
});

morgan.token('package', function () {
  'use strict';
  return '[' + pkg.name + ']';
});

morgan.token('status', function (req, res) {
  'use strict';
  var color = 32; // green
  var status = res.statusCode;

  if (status >= 500) color = 31; // red
  else if (status >= 400) color = 33; // yellow
  else if (status >= 300) color = 36; // cyan

  return '\x1b[' + color + 'm' + status + '\x1b[0m';
});

app.use(morgan(config.app.set.morgan));

var mongostore = config.app.cookie.options;
mongostore.store = new MongoStore({
  mongooseConnection: mongoose.connection,
  stringify: false,
});

app.use(session(mongostore));

app.use(flash());

app.use(express.static(path.join(__dirname, config.app.set.static)));

// Configure passport-local to use account model for authentication
if (config.auth.strategy === 'ldap') {
  var getLDAPConfiguration = function (req, cb) {
    'use strict';
    process.nextTick(function () {
      var opts = config.auth.ldap;
      cb(null, opts);
    });
  };

  passport.use(new LdapAuth(getLDAPConfiguration));
  passport.serializeUser(function (user, done) {
    'use strict';
    done(null, user);
  });

  passport.deserializeUser(function (user, done) {
    'use strict';
    done(null, user);
  });
} else {
  passport.use(Account.createStrategy());
  passport.serializeUser(Account.serializeUser());
  passport.deserializeUser(Account.deserializeUser());
}

// Configure passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect mongoose
var uri = process.env.DB_URI || config.db.uri;
mongoose.connect(path.join(uri, config.db.name), function (err) {
  'use strict';
  if (err) {
    log.error('Could not connect to mongodb on %s.', uri);
    log.warn('Ensure that you have mongodb running and mongodb accepts ' +
     'connections on standard ports!');
  }
});

// Configure routes
// Route dependencies
var routes = require('./routes/routes');

// Uncomment 'routes.ensureAuthenticated' to prevent user creation for everyone
app.get('/', routes.index);
app.get('/s?', routes.search);
app.get('/signin', routes.signin);
app.get('/settings', routes.settings);
app.get('/settings/logging', routes.ensureAuthenticated, routes.logging);
app.get('/accounts/:username', routes.ensureAuthenticated, routes.accounts);
app.get('/settings/account/create', /*routes.ensureAuthenticated,*/ routes.accountCreate);
app.get('/settings/category/create', routes.ensureAuthenticated, routes.categoryCreate);
app.get('/settings/tab/create', routes.ensureAuthenticated, routes.tabCreate);

app.post('/signin', mltr.array(), passport.authenticate(
  config.auth.strategy === 'ldap' ? 'ldapauth' : 'local', {
    failureRedirect: '/signin',
    failureFlash: true,
  }
), routes.postSignin);
app.post('/signout', mltr.array(), routes.ensureAuthenticated, routes.postSignout);
app.post('/score', mltr.array(), routes.postScore);
app.post('/settings/account/create', mltr.array(), routes.postAccountCreate);
app.post('/settings/account/update', mltr.array(), routes.postAccountUpdate);
app.post('/settings/account/edit', mltr.array(), routes.ensureAuthenticated,
 routes.postAccountEdit);
app.post('/settings/account/details', mltr.array(), routes.ensureAuthenticated,
 routes.postAccountDetails);
app.post('/settings/account/delete', mltr.array(), routes.postAccountDelete);
app.post('/settings/category/create', mltr.array(), routes.postCategoryCreate);
app.post('/settings/category/update', mltr.array(), routes.postCategoryUpdate);
app.post('/settings/category/edit', mltr.array(), routes.ensureAuthenticated,
 routes.postCategoryEdit);
app.post('/settings/category/details', mltr.array(), routes.ensureAuthenticated,
 routes.postCategoryDetails);
app.post('/settings/category/delete', mltr.array(), routes.postCategoryDelete);
app.post('/settings/tab/create', mltr.array(), routes.postTabCreate);
app.post('/settings/tab/update', mltr.array(), routes.postTabUpdate);
app.post('/settings/tab/edit', mltr.array(), routes.ensureAuthenticated, routes.postTabEdit);
app.post('/settings/tab/details', mltr.array(), routes.ensureAuthenticated, routes.postTabDetails);
app.post('/settings/tab/delete', mltr.array(), routes.postTabDelete);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  'use strict';
  var err = new Error('Page Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.enable('verbose errors');
  app.use(function (err, req, res) {
    'use strict';
    res.status(err.status || 500);
    log.error('%s: %s', err.message, req.url);
    res.render('sites/status', {
      title: err.status,
      user: req.user,
      fallover: err,
      header: err.header,
      message: err.message,
    });
  });
}

// production error handler
// no stacktraces leaked to user
if (app.get('env') === 'production') {
  app.disable('verbose errors');
  app.use(function (err, req, res) {
    'use strict';
    res.status(err.status || 500);
    log.error('%s: %s', err.message, req.url);
    res.render('sites/status', {
      status: err.status,
      message: err.message,
      error: err,
    });
  });
}

// Handles uncaught exceptions.
process.on('uncaughtException', function (e) {
  'use strict';
  log.debug('Caught exception: ', e.stack);
  log.error('Caught exception: ', e.message);
  return;
});

// Fires the server.
var server = http.createServer(app);
server.listen(app.get('port'), app.get('address'), function () {
  'use strict';
  log.info('%s (%s) is running.', process.title, process.version);
  log.info('process id is %d.', process.pid);
  log.info('%s is running in %s mode.', pkg.name, app.settings.env);
  log.info('listening on %s:%d.', server.address().address, server.address().port);
  log.info('ctrl+c to shut down.');
});
