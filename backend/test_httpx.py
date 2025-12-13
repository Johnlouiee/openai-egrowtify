import httpx
try:
    with httpx.Client() as client:
        print("httpx.Client() created successfully")
except Exception as e:
    print(f"Error creating httpx.Client(): {e}")
