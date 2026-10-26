/** Hosting flags are checked at runtime; neither provider has a persistent local disk. */
export function isServerlessDeployment() {
  return Boolean(
    process.env.VERCEL ||
    process.env.NETLIFY ||
    process.env.AWS_LAMBDA_FUNCTION_NAME,
  );
}

export function isPreviewDeployment() {
  return (
    process.env.VERCEL_ENV === "preview" ||
    process.env.CONTEXT === "deploy-preview" ||
    process.env.CONTEXT === "branch-deploy"
  );
}
