import json, gzip, boto3, os, traceback

s3  = boto3.client("s3")
ssm = boto3.client("ssm")
BUCKET = os.environ["BUCKET_NAME"]
DEBUG  = os.environ.get("DEBUG", "0") == "1"

def lambda_handler(event, ctx):
    try:
        label = event["label"]  # "cat" or "dog"

        spill_key = f"manifest/{label}/spill.json"
        index_key = f"manifest/{label}/index.json"
        shard_prefix = f"manifest/{label}/shards/"

        # Get max shard size from SSM
        max_param = ssm.get_parameter(Name="/pet-images/prod/shard/max_size")
        max_size = int(max_param["Parameter"]["Value"])

        # Load spill.json
        try:
            spill_obj = s3.get_object(Bucket=BUCKET, Key=spill_key)
            lines = spill_obj["Body"].read().decode().splitlines()
        except s3.exceptions.NoSuchKey:
            return

        if not lines:
            return

        # Load or initialize index.json
        try:
            idx_obj = s3.get_object(Bucket=BUCKET, Key=index_key)
            index = json.loads(idx_obj["Body"].read())
        except s3.exceptions.NoSuchKey:
            index = []

        # Determine last shard (or create new)
        if index:
            last_shard = index[-1]["shard"]
            start = index[-1]["start"]
        else:
            last_shard = "0.json.gz"
            start = 1

        # Load existing shard data (if any)
        try:
            shard_obj = s3.get_object(Bucket=BUCKET, Key=shard_prefix + last_shard)
            shard_data = json.loads(gzip.decompress(shard_obj["Body"].read()))
        except s3.exceptions.NoSuchKey:
            shard_data = []

        # Add new records from spill
        new_records = [json.loads(line) for line in lines]
        shard_data.extend(new_records)

        # Handle shard overflow
        if len(shard_data) > max_size:
            end = start + len(shard_data[:max_size]) - 1
            new_entry = {
                "start": start,
                "end": end,
                "shard": last_shard
            }
            if index:
                index[-1] = new_entry
            else:
                index.append(new_entry)

            _upload_shard(shard_prefix + last_shard, shard_data[:max_size])

            # Prepare new shard
            next_shard_num = int(last_shard.split('.')[0]) + 1
            next_shard = f"{next_shard_num}.json.gz"
            next_start = end + 1
            index.append({"start": next_start, "end": next_start - 1, "shard": next_shard})
            _upload_shard(shard_prefix + next_shard, shard_data[max_size:])
        else:
            # Update single shard and index
            new_entry = {
                "start": start,
                "end": start + len(shard_data) - 1,
                "shard": last_shard
            }
            if index:
                index[-1] = new_entry
            else:
                index.append(new_entry)
            _upload_shard(shard_prefix + last_shard, shard_data)

        # Save updated index.json
        s3.put_object(Bucket=BUCKET,
                      Key=index_key,
                      Body=json.dumps(index).encode(),
                      ContentType="application/json")

        # Reset spill.json
        s3.put_object(Bucket=BUCKET, Key=spill_key, Body=b"")
        print("Cleared spill.json")

    except Exception as e:
        traceback.print_exc()
        if DEBUG:
            return {
                "statusCode": 500,
                "body": json.dumps({
                    "error": str(e),
                    "type": e.__class__.__name__,
                    "requestId": ctx.aws_request_id
                })
            }
        else:
            return {
                "statusCode": 500,
                "body": json.dumps("internal error")
            }

def _upload_shard(key, data):
    gz = gzip.compress(json.dumps(data).encode())
    s3.put_object(Bucket=BUCKET,
                  Key=key,
                  Body=gz,
                  ContentType="application/json",
                  ContentEncoding="gzip")
