import { Buffer } from 'node:buffer'
import test from 'node:test'
import assert from 'node:assert/strict'
import { DRIVER_IMPORT_COLUMNS, parseDriverImportFile, validateDriverImport, driverTemplateCsv } from '../src/features/drivers/DriverImport.js'
import { EMPLOYEE_IMPORT_COLUMNS, parseEmployeeImportFile, validateEmployeeImport, employeeTemplateCsv } from '../src/features/employees/EmployeeImport.js'
import { driverPayload } from '../src/features/drivers/DriverApi.js'
import { employeePayload } from '../src/features/employees/EmployeeApi.js'

const base={'Employee ID':'TEST-1',Name:'Test import',Phone:'+999000000001',Department:'Operations','Job Title':'Test coordinator','Monthly Salary (SAR)':'5000','Daily Rate (SAR)':'200',Nationality:'INDIAN','Iqama Expiry Date':'2030-12-31','Passport No.':'TEST-PASS-1','Passport Expiry Date':'2031-01-01','Driving Licence No.':'TEST-LIC-1','Driving Licence Expiry Date':'2030-11-30','Insurance Policy No.':'TEST-POL-1','Insurance Expiry Date':'2026-07-31','Home-country Contact':'+999000000002','Company ID':'TEST-BATCH', 'Hourly Rate (SAR)':'25', 'Monthly Rate (SAR)':'4500'}
const rows=(columns,extra={})=>[columns,columns.map(column=>({...base,...extra})[column]??'')]
test('both personnel imports preserve full profile and date-only compliance fields into API payloads',()=>{
 for(const [columns,validate,payload] of [[DRIVER_IMPORT_COLUMNS,validateDriverImport,driverPayload],[EMPLOYEE_IMPORT_COLUMNS,validateEmployeeImport,employeePayload]]){
  const row=validate(rows(columns),[])[0]
  assert.deepEqual(row.errors,[])
  const sent=payload(row.driver||row.employee)
  for(const key of ['nationality','iqamaExpiry','passportNumber','passportExpiry','licenceNumber','licenceExpiry','insuranceNumber','insuranceExpiry','emergencyHome','companyId'])assert.ok(sent[key],key)
  assert.equal(sent.insuranceExpiry,'2026-07-31')
  assert.equal(sent.hourlyRate,25)
 }
})
test('invalid optional dates and experience are rejected instead of ignored',()=>{
 for(const [columns,validate] of [[DRIVER_IMPORT_COLUMNS,validateDriverImport],[EMPLOYEE_IMPORT_COLUMNS,validateEmployeeImport]]){
  const result=validate(rows(columns,{'Iqama Expiry Date':'2030-02-30','Years Experience':'90'}),[])[0]
  assert.ok(result.errors.some(error=>error.startsWith('Iqama Expiry Date')))
  assert.ok(result.errors.some(error=>error.startsWith('Years Experience')))
 }
})
test('CSV dates are not guessed and expanded template examples still validate',async()=>{
 for(const [template,parse,validate] of [[driverTemplateCsv,parseDriverImportFile,validateDriverImport],[employeeTemplateCsv,parseEmployeeImportFile,validateEmployeeImport]]){
  const bytes=Buffer.from(template()),file={name:'template.csv',size:bytes.length,arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}
  const parsed=await parse(file)
  assert.equal(parsed[0].length,parsed[1].length)
  assert.deepEqual(validate(parsed,[])[0].errors,[])
 }
})
