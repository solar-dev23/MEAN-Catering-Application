'use strict';

import crypto from 'crypto';
import mongoose from 'mongoose';
mongoose.Promise = require('bluebird');
import {Schema} from 'mongoose';

var TempUserSchema = new Schema({
  firstname: String,
  lastname: String,
  email: {
    type: String,
    lowercase: true,
    required: true
  },
  role: {
    type: String,
    default: 'user'
  },
  password: {
    type: String,
    required: true
  },
  foodTypes: Array,
  serviceTypes: Array,
  contactInfo: String,
  name: String,
  companyName: String,
  minprice: String,
  location: String,
  website: String,
  phone: String,
  paymentInfo: String,
  description: String,
  veganOffers: Boolean,
  provider: String,
  salt: String,
  logo: String,
  status: String //active, pending
  //logo: { data: Buffer, contentType: String }
});

/**
 * Virtuals
 */

// Public profile information
TempUserSchema
  .virtual('profile')
  .get(function() {
    return {
      'firstname': this.firstname,
      'lastname': this.lastname,
      'foodTypes': this.foodTypes,
      'contactInfo': this.contactInfo,
      'companyName': this.companyName,
      'name': this.name,
      'minprice': this.minprice,
      'location': this.location,
      'website': this.website,
      'phone': this.phone,
      'paymentInfo': this.paymentInfo,
      'description': this.description,
      'veganOffers': this.veganOffers,
      'role': this.role,
      'status': this.status,
      'logo': this.logo
    };
  });

// Non-sensitive info we'll be putting in the token
TempUserSchema
  .virtual('token')
  .get(function() {
    return {
      '_id': this._id,
      'role': this.role
    };
  });

/**
 * Validations
 */

// Validate empty email
TempUserSchema
  .path('email')
  .validate(function(email) {
    return email.length;
  }, 'Email cannot be blank');

// Validate empty password
TempUserSchema
  .path('password')
  .validate(function(password) {
    return password.length;
  }, 'Password cannot be blank');

// Validate email is not taken
TempUserSchema
  .path('email')
  .validate(function(value, respond) {
    var self = this;

    return this.constructor.findOne({ email: value }).exec()
      .then(function(user) {
        if (user) {
          if (self.id === user.id) {
            return respond(true);
          }
          return respond(false);
        }
        return respond(true);
      })
      .catch(function(err) {
        throw err;
      });
  }, 'The specified email address is already in use.');

var validatePresenceOf = function(value) {
  return value && value.length;
};

/**
 * Pre-save hook
 */
TempUserSchema
  .pre('save', function(next) {
    // Handle new/update passwords
    if (!this.isModified('password')) {
      return next();
    }

    if (!validatePresenceOf(this.password)) {
      return next(new Error('Invalid password'));
    }

    // Make salt with a callback
    this.makeSalt((saltErr, salt) => {
      if (saltErr) {
      return next(saltErr);
    }
    this.salt = salt;
    /*this.encryptPassword(this.password, (encryptErr, hashedPassword) => {
      if (encryptErr) {
        return next(encryptErr);
      }
      this.password = hashedPassword; *
      next();
    }); */
  });
});

/**
 * Methods
 */
TempUserSchema.methods = {
  /**
   * Authenticate - check if the passwords are the same
   *
   * @param {String} password
   * @param {Function} callback
   * @return {Boolean}
   * @api public
   */
  authenticate(password, callback) {
  if (!callback) {
    return this.password === this.encryptPassword(password);
  }

  this.encryptPassword(password, (err, pwdGen) => {
    if (err) {
    return callback(err);
  }

  if (this.password === pwdGen) {
    callback(null, true);
  } else {
    callback(null, false);
  }
});
},

/**
 * Make salt
 *
 * @param {Number} byteSize Optional salt byte size, default to 16
 * @param {Function} callback
 * @return {String}
 * @api public
 */
makeSalt(byteSize, callback) {
  var defaultByteSize = 16;

  if (typeof arguments[0] === 'function') {
    callback = arguments[0];
    byteSize = defaultByteSize;
  } else if (typeof arguments[1] === 'function') {
    callback = arguments[1];
  }

  if (!byteSize) {
    byteSize = defaultByteSize;
  }

  if (!callback) {
    return crypto.randomBytes(byteSize).toString('base64');
  }

  return crypto.randomBytes(byteSize, (err, salt) => {
      if (err) {
    callback(err);
  } else {
    callback(null, salt.toString('base64'));
  }
});
},

/**
 * Encrypt password
 *
 * @param {String} password
 * @param {Function} callback
 * @return {String}
 * @api public
 */
encryptPassword(password, callback) {
  if (!password || !this.salt) {
    if (!callback) {
      return null;
    } else {
      return callback('Missing password or salt');
    }
  }

  var defaultIterations = 10000;
  var defaultKeyLength = 64;
  var salt = new Buffer(this.salt, 'base64');

  if (!callback) {
    return crypto.pbkdf2Sync(password, salt, defaultIterations, defaultKeyLength)
      .toString('base64');
  }

  return crypto.pbkdf2(password, salt, defaultIterations, defaultKeyLength, (err, key) => {
      if (err) {
    callback(err);
  } else {
    callback(null, key.toString('base64'));
  }
});
}
};

export default mongoose.model('TempUser', TempUserSchema);