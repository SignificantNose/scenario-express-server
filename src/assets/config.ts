import "dotenv/config";

interface Config {
  port: number;
}

const config: Config = {
  port: parseInt(process.env.PORT || "3000", 10),
};

export default config;
