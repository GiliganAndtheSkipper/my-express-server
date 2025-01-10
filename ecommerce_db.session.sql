CREATE TABLE Users (
    User_ID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Email VARCHAR(100) UNIQUE NOT NULL,
    Address VARCHAR(255),
    Phone_Number VARCHAR(20),
    Updated_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Products (
    Product_ID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Description TEXT,
    Price DECIMAL(10, 2) NOT NULL,
    Stock INT NOT NULL,
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Carts (
    Cart_ID SERIAL PRIMARY KEY,
    User_ID INT REFERENCES Users(User_ID),
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE CartItems (
    Cart_Id INT,
    Product_ID INT,
    Cart_Item_ID SERIAL,
    Quantity INT NOT NULL,
    PRIMARY KEY (Cart_ID, Product_ID),
    FOREIGN KEY (Cart_ID) REFERENCES Carts(Cart_ID),
    FOREIGN KEY (Product_ID) REFERENCES Products(Product_ID)
);

CREATE TABLE Orders (
    Order_ID SERIAL PRIMARY KEY,
    User_ID INT REFERENCES Users(User_ID),
    Total_Amount DECIMAL(10, 2) NOT NULL,
    Order_Date DATE NOT NULL
);

CREATE TABLE OrderItems (
    Order_ID INT,
    Product_ID INT,
    Order_Item_ID SERIAL,
    Quantity INT NOT NULL,
    PRIMARY KEY (Order_ID, Product_ID),
    FOREIGN KEY (Order_ID) REFERENCES Orders(Order_ID),
    FOREIGN KEY (Product_ID) REFERENCES Products(Product_ID )
);






