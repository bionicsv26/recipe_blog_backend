#!/bin/sh
set -eu

ENDPOINT="${S3_ENDPOINT_INTERNAL}"

for BUCKET in "${S3_BUCKET_NAME}" "${S3_TEST_BUCKET_NAME}"; do
  echo "==> Bucket: ${BUCKET}"

  if aws --endpoint-url "${ENDPOINT}" s3api head-bucket --bucket "${BUCKET}" >/dev/null 2>&1; then
    echo "    already exists"
  else
    aws --endpoint-url "${ENDPOINT}" s3api create-bucket --bucket "${BUCKET}"
    echo "    created"
  fi

  POLICY=$(cat <<EOF
{"Version":"2012-10-17","Statement":[{"Sid":"PublicRead","Effect":"Allow","Principal":"*","Action":["s3:GetObject"],"Resource":["arn:aws:s3:::${BUCKET}/*"]}]}
EOF
)

  aws --endpoint-url "${ENDPOINT}" s3api put-bucket-policy \
    --bucket "${BUCKET}" --policy "${POLICY}"
  echo "    public read policy applied"
done

echo "S3 init done."