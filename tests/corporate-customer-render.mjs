import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
const server = await createServer({configLoader:'native',server:{middlewareMode:true},appType:'custom'})
try {
 const { default: Editor } = await server.ssrLoadModule('/src/features/customers/CustomerEditor.jsx')
 const corporate=renderToStaticMarkup(React.createElement(Editor,{type:'Corporate',lockType:true,onSave:()=>{},onCancel:()=>{}}))
 assert.match(corporate,/Add Corporate Customer/)
 assert.match(corporate,/Billing phone/)
 assert.match(corporate,/Billing email/)
 assert.match(corporate,/data-permission-scope="customers.create"/)
 assert.doesNotMatch(corporate,/aria-label="Customer type"/)
 assert.equal((corporate.match(/<form\b/g)||[]).length,1)
 const { default: Trip } = await server.ssrLoadModule('/src/features/corporate-trips/CorporateTripForm.jsx')
 const markup=renderToStaticMarkup(React.createElement(Trip,{kind:'Advance',trips:[],bookings:[],companies:[{id:7,type:'Corporate',status:'Active',name:'Visible Customer'},{id:8,type:'Corporate',status:'Inactive',name:'Hidden Inactive'}],quotes:[],vehicles:[],drivers:[],onSave:()=>{},onCancel:()=>{},onAddCompany:()=>{}}))
 assert.match(markup,/Select a corporate customer/)
 assert.match(markup,/Visible Customer/)
 assert.doesNotMatch(markup,/Hidden Inactive/)
 assert.doesNotMatch(markup,/corporate-company-suggestions|Choose or type a company/)
 assert.match(markup,/data-permission="customers.create"/)
 assert.equal((markup.match(/<form\b/g)||[]).length,1)
 console.log('PASS: locked Corporate customer editor and trip customer picker render without invalid components or nested forms.')
}finally{await server.close()}
