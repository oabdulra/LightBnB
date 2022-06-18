const properties = require('./json/properties.json');
const users = require('./json/users.json');

const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

//helper function to determine the type of operator needed
const queryOp = (queryParams) => {
  let queryString = ` `;
  if (queryParams.length >= 1) {
    queryString += ` AND `;
  } else {
    queryString += ` WHERE `;
  }
  return queryString;
}

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {

  //query in const var as a string to prevent sql injection
  const queryString = `SELECT * FROM users WHERE email = $1`;

 return pool
    .query(queryString, [email])
    .then((result) => {
      if (result.rows) {
      return result.rows[0];
      } else {
      return null;
      }
    })
    .catch((err) => {
      console.log(err.message);
    });

}
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {

  //query in const var as a string to prevent sql injection
  const queryString = `SELECT * FROM users WHERE id = $1`;

  return pool
    .query(queryString, [id])
    .then((result) => {
      if (result.rows) {
      return result.rows[0];
      } else {
      return null;
      }
    })
    .catch((err) => {
      console.log(err.message);
    });
}
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {

  //query in const var as a string to prevent sql injection
  const queryString = `
  INSERT INTO users (name, email, password)
  VALUES ($1, $2, $3)
  RETURNING *`;

  return pool
    .query(queryString, [user.name, user.email, user.password])
    .then((result) => {
      result.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });

}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  
  //query in const var as a string to prevent sql injection
  const queryString = `
  SELECT reservations.*, properties.*, avg(rating) as average_rating
  FROM reservations
  JOIN properties ON reservations.property_id = properties.id
  JOIN property_reviews ON properties.id = property_reviews.property_id
  WHERE reservations.guest_id = $1
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2;`;

  return pool.query(queryString, [guest_id, limit])
    .then((result) => {
      return result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function(options, limit) {

  const queryParams = [];

  //General Use query, will append to this for certain criteria
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id`;

  // if the search option has a city, this if statement will add it to the parameters
  // and then append the search to the querystring set up earlier
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `${queryOp(queryParams)} city LIKE $${queryParams.length} `;
  }

  // if the search option has an owner in its parameters, 
  // this if statement will append the search query with properties from only this owner
  if (options.owner_id) {
    queryParams.push(`%${options.owner_id}%`);
    queryString += `${queryOp(queryParams)} owner_id = $${queryParams.length} `;

  }

  // if the search option has a minimum price,
  // it will append the search to the querystring set up earlier
  if (options.minimum_price_per_night) {
    queryParams.push(`%${options.minimum_price_per_night * 100}`);
    queryString += `${queryOp(queryParams)} cost_per_night >=  $${queryParams.length}`;
  }

  // if the search option has a maximum price,
  // it will append the search to the querystring set up earlier
  if (options.maximum_price_per_night) {
    queryParams.push(`%${options.maximum_price_per_night * 100}`);
    queryString += `${queryOp(queryParams)} cost_per_night <=  $${queryParams.length}`;
  }

  queryString += `GROUP BY properties.id`;


  // if search option has a minimum rating
  // it will append the search to the querystring set up earlier
  if (options.minimum_rating) {
    queryParams.push(`%${options.minimum_rating}`);
    queryString += `HAVING avg(property_reviews.rating) >=  $${queryParams.length}`;
  }

  
  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};`;

  //returns query as a final step
  return pool.query(queryString, queryParams)
    .then((result) => {
       result.rows;
    })
    .catch((err) => {
      console.log(err.message);
    });
}
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const queryString = ` 
      INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city, province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,)
      RETURNING *`;
  
  const queryParams = [
    property.owner_id,
    property.title,
    property.description,
    property.thumbnail_photo_url,
    property.cover_photo_url,
    property.cost_per_night,
    property.street,
    property.city,
    property.province,
    property.post_code,
    property.country,
    property.parking_spaces,
    property.number_of_bathrooms,
    property.number_of_bedrooms,
  ];
  
   //returns query as a final step
   return pool.query(queryString, queryParams)
   .then((result) => {
     console.log('insert worked');
     return result.rows.length;
   })
   .catch((err) => {
     console.log(err.message);
   });
}
exports.addProperty = addProperty;
