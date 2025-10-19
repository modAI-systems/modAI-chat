module.exports = {
  default: {
    import: ["tests/**/*.ts"],
    format: ["progress"],
    formatOptions: {
      snippetInterface: "async-await",
    },
    paths: ["features/**/*.feature"],
    publishQuiet: true,
  },
};
