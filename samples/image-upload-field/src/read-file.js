export default function readFileAsURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = function(e) {
      resolve(e.target.result)
    }

    reader.onerror = function(e) {
      reject(e.error)
    }

    reader.onabort = function(e) {
      reject(new Error("File aborted."))
    }

    reader.readAsDataURL(file)
  })
}
