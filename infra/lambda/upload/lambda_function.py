import base64, binascii, json, os, uuid
import boto3
import traceback


s3      = boto3.client("s3")
ssm     = boto3.client("ssm")
lambda_ = boto3.client("lambda")  

BUCKET            = os.environ["BUCKET_NAME"]
COMPACT_FUNC_ARN  = os.environ.get("COMPACT_FUNC_ARN")      
SSM_ENV_PREFIX    = os.environ.get("SSM_ENV_PREFIX", "/pet-images/prod")  

ALLOWED = {"cat", "dog"}
EXT     = {"image/jpeg": ".jpg",
           "image/png" : ".png",
           "image/webp": ".webp"}

def lambda_handler(event, ctx):
    try:
        # Validate request 
        label = (event.get("queryStringParameters") or {}).get("label")
        if label not in ALLOWED:
            return _resp(400, "label must be cat or dog")


        try:
            raw = base64.b64decode(event["body"])
        except (binascii.Error, ValueError):
            return _resp(400, "body is not valid base64")

        ctype = (event["headers"].get("content-type") or "").lower()
        ext   = EXT.get(ctype)
        if not ext:
            return _resp(400, f"unsupported {ctype}")

        # Upload image to S3 
        key = f"{label}/{uuid.uuid4()}{ext}"
        s3.put_object(
            Bucket=BUCKET,
            Key=key,
            Body=raw,
            ContentType=ctype,
            Metadata={"label": label}
        )

        # Append to spill log 
        spill_key = f"manifest/{label}/spill.json"
        new_line  = json.dumps({"key": key, "weight": 1}) + "\n"

        try:  # download existing spill (may not exist yet)
            spilled = s3.get_object(Bucket=BUCKET, Key=spill_key)["Body"].read()
            body    = spilled + new_line.encode()
        except s3.exceptions.NoSuchKey:
            body = new_line.encode()

        s3.put_object(
            Bucket=BUCKET,
            Key=spill_key,
            Body=body,
            ContentType="application/json"
        )

        # Increment label counter in SSM
        counter_param = f"{SSM_ENV_PREFIX}/counters/{label}"
        try:
            current = int(ssm.get_parameter(Name=counter_param)["Parameter"]["Value"])
        except ssm.exceptions.ParameterNotFound:
            current = 0
        ssm.put_parameter(
            Name=counter_param,
            Value=str(current + 1),
            Overwrite=True
        )

        # Trigger compaction if spill ≥ threshold 
        threshold_param = f"{SSM_ENV_PREFIX}/compact/size_threshold"
        threshold = int(ssm.get_parameter(Name=threshold_param)["Parameter"]["Value"])

        if len(body) >= threshold and COMPACT_FUNC_ARN:
            lambda_.invoke(
                FunctionName=COMPACT_FUNC_ARN,
                InvocationType="Event",  # async, fire-and-forget
                Payload=json.dumps({"label": label}).encode()
            )

        # Success response 
        return _resp(201, {"key": key})

    except Exception as e:
        print("ERR:", e)
        # Log full stack trace to CloudWatch
        traceback.print_exc()  

        if os.environ.get("DEBUG") == "1":
            return _resp(500, {
                "error": str(e),
                "type": e.__class__.__name__
            })
        else:
            return _resp(500, "internal error")


# helper function
def _resp(code, body):
    return {
        "statusCode": code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body)
    }
