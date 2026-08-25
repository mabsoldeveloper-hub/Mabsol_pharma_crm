const fs = require('fs');
const path = require('path');
const mongoose = require(path.join(__dirname, '..', 'node_modules', 'mongoose'));

const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
let uri = '';
for (const line of envContent.split('\n')) {
  if (line.startsWith('MONGODB_URI=')) {
    uri = line.replace('MONGODB_URI=', '').trim().replace(/^["']|["']$/g, '');
  }
}

async function inspectData() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const collectionsToCheck = [
    'vfp_new_folder_mdis',
    'vfp_new_folder_dis',
    'vfp_new_folder_gledger',
    'vfp_new_folder_pendings',
    'vfp_new_folder_order',
    'vfp_new_folder_pro',
    'vfp_new_folder_probat'
  ];

  for (const cName of collectionsToCheck) {
    const col = db.collection(cName);
    const count = await col.countDocuments();
    console.log(`\n================== ${cName} (Total: ${count}) ==================`);
    
    // Sample document keys
    const sample = await col.findOne({});
    if (sample) {
      console.log('Keys:', Object.keys(sample));
      console.log('Sample record (truncated):', {
        _id: sample._id,
        _vfpTable: sample._vfpTable,
        companyCode: sample.companyCode,
        fyCode: sample.fyCode,
        companyId: sample.companyId,
        COMPANY: sample.COMPANY,
        DATE: sample.DATE,
        DDATE: sample.DDATE,
        TYPE: sample.TYPE,
        TRANSFER: sample.TRANSFER,
        FINAL: sample.FINAL,
        AMOUNT: sample.AMOUNT,
        BALANCE: sample.BALANCE
      });
    }

    // Check distinct company/FY identifiers in this collection
    const distinctVfpTable = await col.distinct('_vfpTable');
    console.log('Distinct _vfpTable:', distinctVfpTable.slice(0, 10));

    const distinctCompany = await col.distinct('COMPANY');
    console.log('Distinct COMPANY:', distinctCompany.slice(0, 10));

    const distinctCompanyCode = await col.distinct('companyCode');
    console.log('Distinct companyCode:', distinctCompanyCode.slice(0, 10));

    const distinctFyCode = await col.distinct('fyCode');
    console.log('Distinct fyCode:', distinctFyCode.slice(0, 10));

    const distinctCompanyId = await col.distinct('companyId');
    console.log('Distinct companyId:', distinctCompanyId.slice(0, 10));

    // Check date min and max if DATE exists
    if (sample && (sample.DATE || sample.DDATE)) {
      const dateField = sample.DATE ? 'DATE' : 'DDATE';
      const minDoc = await col.find({ [dateField]: { $ne: null } }).sort({ [dateField]: 1 }).limit(1).toArray();
      const maxDoc = await col.find({ [dateField]: { $ne: null } }).sort({ [dateField]: -1 }).limit(1).toArray();
      console.log(`Date range (${dateField}): min = ${minDoc[0]?.[dateField]} | max = ${maxDoc[0]?.[dateField]}`);
    }
  }

  await mongoose.disconnect();
}

inspectData().catch(console.error);
