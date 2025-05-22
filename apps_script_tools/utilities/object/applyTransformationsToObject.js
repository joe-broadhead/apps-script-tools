/**
 * @function applyTransformationsToObject
 * @description Applies a transformation schema to an object, modifying its values based on provided transformation functions
 *              or static values. Returns a new object with the transformations applied.
 * @param {Object} object - The input object to which transformations will be applied.
 * @param {Object} transformationSchema - The schema defining transformations for the object. The schema should be an object where:
 *   - Keys are the property names in the input object.
 *   - Values are either:
 *     - A function that takes the object as input and returns a transformed value.
 *     - A static value to directly assign to the property.
 * @returns {Object} A new object with transformations applied as defined in the schema.
 * @example
 * // Defining an object and a transformation schema
 * const obj = { id: 42, name: "John Doe", age: 30 };
 * const schema = {
 *   name: obj => obj.name.toUpperCase(),
 *   age: obj => obj.age + 1,
 *   status: "active" // Assigning a static value
 * };
 * 
 * // Applying the transformations
 * const result = applyTransformationsToObject(obj, schema);
 * console.log(result); // Output: { id: 42, name: "JOHN DOE", age: 31, status: "active" }
 *
 * // Handling errors in transformations
 * const faultySchema = {
 *   invalidKey: obj => obj.nonExistentProperty.toUpperCase() // Will cause an error
 * };
 * applyTransformationsToObject(obj, faultySchema);
 * // Logs: Warning "Error transforming key 'invalidKey': Cannot read properties of undefined"
 * @note
 * - Time Complexity: O(n), where `n` is the number of keys in the `transformationSchema`. Each key is processed once.
 * - Space Complexity: O(n), as a new object is created to store the transformed values.
 * - Errors in transformation functions are caught and logged as warnings, allowing other transformations to proceed.
 */
function applyTransformationsToObject(object, transformationSchema) {
  const newObject = { ...object };

  for (const key of Object.keys(transformationSchema)) {
    try {
      const transform = transformationSchema[key];
      if (typeof transform === "function") {
        newObject[key] = transform(newObject);
      } else {
        // If not a function, assign the value directly
        newObject[key] = transform;
      };
    } catch (error) {
      console.warn(`Error transforming key "${key}": ${error.message}`);
    };
  };
  return newObject;
};
