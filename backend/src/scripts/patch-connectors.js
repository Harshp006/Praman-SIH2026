const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'connectors');

const filesToPatch = [
  { name: 'mca21.js', 
    noteFail: "MCA21: Company marked STRIKE-OFF by Registrar of Companies (RoC). Entity has no legal standing to enter into contracts.", 
    noteWarn: "MCA21: DIN of one director flagged for non-filing of DIR-3 KYC. Director's DIN is deactivated; restoration application required." 
  },
  { name: 'epfo.js', 
    noteFail: "EPFO check failed: ECR not filed for the last 6 months indicating business inactivity or default.", 
    noteWarn: "EPFO: Partial compliance. Contributions deposited but late fees pending for previous quarter." 
  },
  { name: 'cvc.js', 
    noteFail: "CVC debarment order active — GeM blacklist registry match found. Entity ineligible for Central Government procurement. HARD GATE.", 
    noteWarn: "CVC check: Pending vigilance inquiry flagged, though no formal debarment issued yet." 
  },
  { name: 'makeInIndia.js', 
    noteFail: "Make In India verification failed: Local content declared as < 20%, falling below Class II supplier minimum thresholds.", 
    noteWarn: "Make In India: Self-declaration of local content present but supporting CA certificate is missing." 
  },
  { name: 'startupIndia.js', 
    noteFail: "Startup India recognition revoked or expired. Entity is not eligible for exemptions.", 
    noteWarn: "Startup India / OEM certificate uploaded is blurry or outdated. Manual verification advised." 
  },
  { name: 'tenderEligibility.js', 
    noteFail: "Tender eligibility failed: Financial turnover for the last 3 years does not meet the tender's minimum threshold.", 
    noteWarn: "Tender eligibility: Prior experience criteria marginally met. Review past performance reports." 
  }
];

for (const { name, noteFail, noteWarn } of filesToPatch) {
  const filePath = path.join(dir, name);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('hashString(pan)')) {
      console.log(`Skipped ${name} (already patched)`);
      continue;
    }

    // Add hashString to imports
    content = content.replace(
      'const { portalDelay } = require("./_utils");', 
      'const { portalDelay, hashString } = require("./_utils");'
    );

    // Find the return pass block
    const returnPassRegex = /return \{\s*state:\s*"pass",\s*note:[\s\S]*?\};\s*\};/g;
    
    const patch = `
  const hashVal = hashString(pan) % 100;
  if (hashVal < 5) { // 5% chance of failure
    return {
      state: "fail",
      note: "${noteFail}",
    };
  }
  
  if (hashVal >= 5 && hashVal < 20) { // 15% chance of warning
    return {
      state: "warn",
      note: "${noteWarn}",
    };
  }

  $&`;

    content = content.replace(returnPassRegex, patch);
    
    fs.writeFileSync(filePath, content);
    console.log(`Patched ${name}`);
  }
}
