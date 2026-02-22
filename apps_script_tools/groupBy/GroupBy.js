/**
*   ____                         ____        
*  / ___|_ __ ___  _   _ _ __   | __ ) _   _ 
* | |  _| '__/ _ \| | | | '_ \  |  _ \| | | |
* | |_| | | | (_) | |_| | |_) | | |_) | |_| |
*  \____|_|  \___/ \__,_| .__/  |____/ \__, |
*                       |_|            |___/ 
*/

var GroupBy = class GroupBy {
    constructor(df, keys) {
      this.df = df;
      this.keys = keys;
      this.groups = this._buildGroups();
    }

    _buildGroups() {
      const groups = {};
      const groupedIndexes = new Map();
      const keyColumns = this.keys.map(key => {
        if (!this.df.columns.includes(key)) {
          throw new Error(`Column '${key}' not found in DataFrame`);
        }
        return this.df.data[key].array;
      });

      for (let rowIdx = 0; rowIdx < this.df.len(); rowIdx++) {
        const keyValues = new Array(keyColumns.length);
        for (let keyIdx = 0; keyIdx < keyColumns.length; keyIdx++) {
          keyValues[keyIdx] = keyColumns[keyIdx][rowIdx];
        }

        const groupKey = astBuildValuesKey(keyValues);

        if (!groupedIndexes.has(groupKey)) {
          groupedIndexes.set(groupKey, []);
        }

        groupedIndexes.get(groupKey).push(rowIdx);
      }

      for (const [groupKey, rowIndexes] of groupedIndexes.entries()) {
        groups[groupKey] = this.df._buildFromRowIndexes(rowIndexes, true);
      }

      return groups;
    }
  
    agg(aggregations) {
      const outputPlans = [];
      const usedOutputNames = new Set(this.keys);

      const toUniqueOutputName = baseName => {
        if (!usedOutputNames.has(baseName)) {
          usedOutputNames.add(baseName);
          return baseName;
        }

        let suffix = 2;
        while (usedOutputNames.has(`${baseName}_${suffix}`)) {
          suffix += 1;
        }

        const nextName = `${baseName}_${suffix}`;
        usedOutputNames.add(nextName);
        return nextName;
      };

      for (const [colName, aggFuncs] of Object.entries(aggregations)) {
        const funcsArray = Array.isArray(aggFuncs) ? aggFuncs : [aggFuncs];

        funcsArray.forEach((aggFunc, idx) => {
          const isCustomFunc = typeof aggFunc === 'function';
          const suffix = isCustomFunc
            ? (aggFunc.name || `custom_${idx + 1}`)
            : aggFunc;
          const baseColName = `${colName}_${suffix}`;
          const newColName = toUniqueOutputName(baseColName);

          outputPlans.push({
            colName,
            aggFunc,
            isCustomFunc,
            outputName: newColName
          });
        });
      }

      const results = [];
  
      for (const group of Object.values(this.groups)) {
        const groupKeys = group.dropDuplicates(this.keys).select(this.keys);
        const output = {};
  
        outputPlans.forEach(plan => {
          const columnData = group[plan.colName].array;
          output[plan.outputName] = plan.isCustomFunc
            ? plan.aggFunc(columnData)
            : group[plan.colName][plan.aggFunc]();
        });
  
        results.push(groupKeys.assign(output));
      }
  
      return DataFrame.concat(results);
    }

    apply(func) {
      const results = [];
      
      for (const group of Object.values(this.groups)) {
        const transformedGroup = func(group);
        
        if (!(transformedGroup instanceof DataFrame)) {
          throw new Error('The applied function must return a DataFrame');
        }
        
        results.push(transformedGroup);
      }
      return DataFrame.concat(results);
    }

    *[Symbol.iterator]() {
      for (const [key, group] of Object.entries(this.groups)) {
        yield [key, group];
      }
    }
  };

const __astGroupByRoot = typeof globalThis !== 'undefined' ? globalThis : this;
__astGroupByRoot.GroupBy = GroupBy;
this.GroupBy = GroupBy;
