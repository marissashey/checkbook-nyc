// nyc spending data management
class DataManager {
  constructor() {
    this.data_fy25 = null;
    this.departments_df = [];
    this.dept_children_map = {};
    this.dataLoaded = false;
  }

  async loadTreemapData() {
    try {
      const response = await fetch("data/visualizations/treemap_data_FY2025.json");
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      this.data_fy25 = await response.json();
      this.prepareDepartmentData();
      this.dataLoaded = true;
      document.querySelector(".loading").style.display = "none";
    } catch (error) {
      try {
        const response2 = await fetch("./web_app/data/treemap_data_FY2025.json");
        if (response2.ok) {
          this.data_fy25 = await response2.json();
          this.prepareDepartmentData();
          this.dataLoaded = true;
          document.querySelector(".loading").style.display = "none";
          return;
        }
      } catch (error2) {}
      document.querySelector(".loading").innerHTML = 
        `Error loading data<br><small>Please run a local server:<br>python3 -m http.server 8000<br>Then visit http://localhost:8000</small>`;
    }
  }

  prepareDepartmentData() {
    if (!this.data_fy25 || !this.data_fy25.children) return;
    
    this.departments_df = [];
    this.dept_children_map = {};
    let totalValue = 0;

    this.data_fy25.children.forEach((dept, index) => {
      const titleName = this.smartTitleCase(dept.name);

      this.departments_df.push({
        name: titleName,
        value: dept.value,
        percentage: 0,
        original_name: dept.name,
        color: departmentColors[index % departmentColors.length],
      });

      if (dept.children && dept.children.length > 0) {
        this.dept_children_map[titleName] = dept.children;
      }

      totalValue += dept.value;
    });

    this.departments_df.sort((a, b) => b.value - a.value);
    this.departments_df.forEach((dept) => {
      dept.percentage = (dept.value / totalValue) * 100;
    });
  }

  smartTitleCase(name) {
    if (!name || typeof name !== "string") return name;
    
    const abbreviations = [
      "NYC", "IT", "HR", "PR", "TV", "FBI", "CIA", "EPA", "DOE", "DOT", "DMV", 
      "NYPD", "FDNY", "EMS", "OEM", "DEP", "DOB", "HPD", "ACS", "HRA", "DHS", 
      "DOC", "DOHMH", "DOF", "DCAS", "OMB", "LAW", "EDC", "SBS", "DCP", "OATH", 
      "BIC", "CCHR", "CFB", "COIB", "CSB", "DSBS", "FCRC", "LPC", "TAT", "TLC", 
      "VENDEX", "PS", "MS", "HS", "IS", "JHS", "OTPS", "CW", "SE", "GE",
    ];
    
    const nonWords = [
      "of", "the", "for", "to", "in", "on", "at", "by", "with", "from", "up", 
      "about", "into", "over", "after", "a", "an", "as", "but", "or", "nor",
    ];

    const processedName = name.replace(/([A-Z])([A-Z]+)/g, (match, first, rest) => {
      if (abbreviations.includes(match)) {
        return match;
      }
      return first + rest.toLowerCase();
    });

    return processedName
      .split(/\s+/)
      .map((word, index) => {
        if (word.includes("-")) {
          return word
            .split("-")
            .map((part, partIndex) => {
              const upperPart = part.toUpperCase();
              const lowerPart = part.toLowerCase();

              if (abbreviations.includes(upperPart)) {
                return upperPart;
              }

              if (part === upperPart && part.length >= 2 && /^[A-Z]+$/.test(part)) {
                return upperPart;
              }

              return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
            })
            .join("-");
        }

        const upperWord = word.toUpperCase();
        const lowerWord = word.toLowerCase();

        if (abbreviations.includes(upperWord)) {
          return upperWord;
        }

        if (word === upperWord && word.length >= 2 && /^[A-Z]+$/.test(word)) {
          return upperWord;
        }

        if (index > 0 && nonWords.includes(lowerWord)) {
          return lowerWord;
        }

        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(" ")
      .replace(/Department [Oo]f/g, "Dept. of")
      .replace("Administration", "Admin.")
      .replace("And", "&")
      .replace("Miscellaneous", "Misc.");
  }

  prepareProgramData(deptName) {
    let programs = [];

    if (this.dept_children_map[deptName] && this.dept_children_map[deptName].length > 0) {
      programs = this.dept_children_map[deptName].map((p) => ({
        ...p,
        name: this.smartTitleCase(p.name),
      }));
    } else {
      const dept = this.departments_df.find((d) => d.name === deptName);
      let remaining = dept.value;
      const numPrograms = Math.floor(Math.random() * 4) + 3;

      for (let i = 0; i < numPrograms - 1; i++) {
        const value = remaining * (0.2 + Math.random() * 0.3);
        programs.push({ name: `Program ${i + 1}`, value: value });
        remaining -= value;
      }

      programs.push({ name: "Other Programs", value: remaining });
    }

    const spendingCodes = programs.filter((p) => this.isSpendingCode(p.name));
    const namedPrograms = programs.filter((p) => !this.isSpendingCode(p.name));
    return namedPrograms.sort((a, b) => b.value - a.value);
  }

  isSpendingCode(name) {
    return /^[\d-]+$/.test(name);
  }
}

// pastel color palette for departments
const departmentColors = [
  [255, 182, 193], [255, 160, 122], [152, 216, 200], [247, 220, 111],
  [187, 143, 206], [133, 193, 226], [248, 183, 57], [130, 224, 170],
  [241, 148, 138], [215, 189, 226], [169, 223, 191], [250, 215, 160],
  [174, 214, 241], [249, 231, 159], [213, 166, 189], [162, 217, 206],
  [250, 219, 216], [214, 234, 248], [252, 243, 207], [235, 222, 240],
  [213, 244, 230], [253, 235, 208], [232, 218, 239], [209, 242, 235],
  [253, 237, 236], [224, 224, 224],
];