import json, random, gzip, bisect, boto3, os

s3  = boto3.client("s3")
ssm = boto3.client("ssm")
BUCKET = os.environ["BUCKET_NAME"]
SSM_PREFIX = os.environ.get("SSM_ENV_PREFIX", "/pet-images/prod")

def lambda_handler(event, ctx):
    qs = event.get("queryStringParameters") or {}
    label = qs.get("label")
    if label not in ("cat", "dog"):
        return _resp(400, "label must be cat or dog")

    # Try to load index.json
    index_key = f"manifest/{label}/index.json"
    try:
        index_obj = s3.get_object(Bucket=BUCKET, Key=index_key)
        index = json.loads(index_obj["Body"].read())
        if not index:
            raise Exception("Index is empty")
        total = index[-1]["end"]
        r = random.randint(1, total)
        pos = bisect.bisect_left([e["end"] for e in index], r)
        shard_meta = index[pos]

        shard_key = f"manifest/{label}/shards/{shard_meta['shard']}"
        shard_obj = s3.get_object(Bucket=BUCKET, Key=shard_key)
        shard = json.loads(gzip.decompress(shard_obj["Body"].read()))
        record = shard[r - shard_meta["start"]]

    except s3.exceptions.NoSuchKey:
        # Fallback: Try spill.json
        try:
            spill_obj = s3.get_object(Bucket=BUCKET, Key=f"manifest/{label}/spill.json")
            lines = spill_obj["Body"].read().decode().splitlines()
            if not lines:
                return _resp(404, f"no images for label '{label}'")
            entries = [json.loads(l) for l in lines]
            record = random.choice(entries)
        except s3.exceptions.NoSuchKey:
            return _resp(404, f"no images for label '{label}'")

    # Generate presigned URL
    url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": BUCKET, "Key": record["key"]},
        ExpiresIn=300)

    return _resp(200, {"url": url})

def _resp(code, body):
    return {
        "statusCode": code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body)
    }
