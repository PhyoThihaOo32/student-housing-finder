import { DataTypes, Sequelize } from 'sequelize'

if (!process.env.DATABASE_URL) {
  throw new Error('Set DATABASE_URL in backend/.env before starting the API.')
}

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  define: { timestamps: false, underscored: true },
})

const identity = () => ({ type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true })
const integer = () => ({ type: DataTypes.INTEGER, allowNull: false })
const text = () => ({ type: DataTypes.TEXT, allowNull: false })

export const Campus = sequelize.define('Campus', {
  campusId: identity(),
  campusCode: text(),
  name: text(),
}, { tableName: 'campus' })

export const Student = sequelize.define('Student', {
  studentId: identity(),
  campusId: integer(),
  studentNumber: text(),
  firstName: text(),
  lastName: text(),
  email: text(),
  passwordHash: DataTypes.TEXT,
}, { tableName: 'student' })

export const HousingUnit = sequelize.define('HousingUnit', {
  housingUnitId: identity(),
  campusId: integer(),
  buildingName: text(),
  unitLabel: text(),
  unitType: text(),
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: 'housing_unit' })

export const HousingRequest = sequelize.define('HousingRequest', {
  requestId: identity(),
  studentId: integer(),
  submittedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
  preferredUnitType: DataTypes.TEXT,
  requestedUnitId: DataTypes.INTEGER,
  reportsEnrollment: DataTypes.BOOLEAN,
  moveInTimeframe: DataTypes.TEXT,
  stayThroughMoveIn: DataTypes.TEXT,
  expectedStayLength: DataTypes.TEXT,
  openToAnotherUnit: DataTypes.TEXT,
  intakeSummary: DataTypes.TEXT,
  status: { ...text(), defaultValue: 'PENDING' },
  decidedAt: DataTypes.DATE,
  denialReason: DataTypes.TEXT,
}, { tableName: 'housing_request' })

export const HousingPlacement = sequelize.define('HousingPlacement', {
  requestId: { ...integer(), primaryKey: true },
  housingUnitId: integer(),
  checkedInAt: DataTypes.DATE,
  endedAt: DataTypes.DATE,
}, { tableName: 'housing_placement' })

Campus.hasMany(Student, { as: 'students', foreignKey: 'campusId' })
Student.belongsTo(Campus, { as: 'campus', foreignKey: 'campusId' })
Campus.hasMany(HousingUnit, { as: 'units', foreignKey: 'campusId' })
HousingUnit.belongsTo(Campus, { as: 'campus', foreignKey: 'campusId' })
Student.hasMany(HousingRequest, { as: 'requests', foreignKey: 'studentId' })
HousingRequest.belongsTo(Student, { as: 'student', foreignKey: 'studentId' })
HousingUnit.hasMany(HousingRequest, { as: 'incomingRequests', foreignKey: 'requestedUnitId' })
HousingRequest.belongsTo(HousingUnit, { as: 'requestedUnit', foreignKey: 'requestedUnitId' })
HousingRequest.hasOne(HousingPlacement, { as: 'placement', foreignKey: 'requestId' })
HousingPlacement.belongsTo(HousingRequest, { as: 'request', foreignKey: 'requestId' })
HousingUnit.hasMany(HousingPlacement, { as: 'placements', foreignKey: 'housingUnitId' })
HousingPlacement.belongsTo(HousingUnit, { as: 'unit', foreignKey: 'housingUnitId' })
