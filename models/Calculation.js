const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Calculation = sequelize.define('Calculation', {
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: false
  },
  operation: {
    type: DataTypes.STRING,
    allowNull: false
  },
  num1: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  num2: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  result: {
    type: DataTypes.FLOAT,
    allowNull: false
  }
});

module.exports = Calculation;