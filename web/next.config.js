const createNextIntlPlugin = require('next-intl/plugin');

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.output.devtoolModuleFilenameTemplate = '[absolute-resource-path]';
    }
    return config;
  },
};

module.exports = withNextIntl(nextConfig);
