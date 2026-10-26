export const SELLER_FIELDS=[['name','Seller / Registered Name'],['street','Street Address'],['buildingNumber','Building Number'],['additionalNumber','Additional Number'],['district','District'],['city','City'],['country','Country'],['postalCode','Postal Code'],['phone','Phone'],['taxNumber','VAT Number'],['otherId','Registration / Other ID']]
export const BANK_FIELDS=[['accountName','Account Name'],['bankName','Bank Name'],['branchName','Branch Name'],['accountNumber','Account Number'],['iban','IBAN']]
export const blankMakProfile=()=>({version:0,issuer:Object.fromEntries(SELLER_FIELDS.map(([key])=>[key,key==='name'?'MAK International':key==='country'?'Saudi Arabia':''])),account:Object.fromEntries(BANK_FIELDS.map(([key])=>[key,''])),paymentInstructions:''})
export const applyBillingProfile=(invoice,profile)=>({...invoice,issuer:{...blankMakProfile().issuer,...profile.issuer},account:{...blankMakProfile().account,...profile.account},paymentContact:profile.paymentContact||'',paymentInstructions:profile.paymentInstructions||'',billingProfileVersion:profile.version})
export function missingBillingDetails(invoice){
 const seller=invoice.issuer||{},bank=invoice.account||{},missing=[]
 for(const [key,label] of [['name','Seller name'],['street','Seller street'],['city','Seller city'],['country','Seller country']])if(!String(seller[key]||'').trim())missing.push(label)
 if(!String(invoice.paymentInstructions||'').trim()){
  if(!String(bank.accountName||'').trim())missing.push('Account name or payment instructions')
  if(!String(bank.bankName||'').trim())missing.push('Bank name or payment instructions')
  if(!String(bank.iban||bank.accountNumber||'').trim())missing.push('IBAN/account number or payment instructions')
 }
 return missing
}
