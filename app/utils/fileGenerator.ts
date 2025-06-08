type DependencyMap = Record<string, { filename: string; content: string }>
type TemplateMap = Record<string, { filename: string; content: string }>

export const generateDependencyFile = (
    dependencyName: string,
    language: string,
): { filename: string; content: string } => {
    switch (language) {
        case "java":
            return generateJavaDependency(dependencyName)
        case "python":
            return generatePythonDependency(dependencyName)
        case "cpp":
            return generateCppDependency(dependencyName)
        default:
            return { filename: "unknown.txt", content: "// Unknown language" }
    }
}

export const generateTemplateFile = (templateName: string, language: string): { filename: string; content: string } => {
    switch (language) {
        case "java":
            return generateJavaTemplate(templateName)
        case "python":
            return generatePythonTemplate(templateName)
        case "cpp":
            return generateCppTemplate(templateName)
        default:
            return { filename: "unknown.txt", content: "// Unknown language" }
    }
}

const generateJavaDependency = (dependencyName: string): { filename: string; content: string } => {
    const dependencies: DependencyMap = {
        "JUnit 5": {
            filename: "TestExample.java",
            content: `import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Assertions;

public class TestExample {
    
    @Test
    public void testAddition() {
        Calculator calc = new Calculator();
        int result = calc.add(2, 3);
        Assertions.assertEquals(5, result, "2 + 3 should equal 5");
    }
    
    @Test
    public void testSubtraction() {
        Calculator calc = new Calculator();
        int result = calc.subtract(5, 3);
        Assertions.assertEquals(2, result, "5 - 3 should equal 2");
    }
}

class Calculator {
    public int add(int a, int b) {
        return a + b;
    }
    
    public int subtract(int a, int b) {
        return a - b;
    }
}`,
        },
        Jackson: {
            filename: "JsonExample.java",
            content: `import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.annotation.JsonProperty;

public class JsonExample {
    public static void main(String[] args) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            
            // Create a person object
            Person person = new Person("John Doe", 30, "john@example.com");
            
            // Convert to JSON
            String json = mapper.writeValueAsString(person);
            System.out.println("JSON: " + json);
            
            // Convert back to object
            Person fromJson = mapper.readValue(json, Person.class);
            System.out.println("Name: " + fromJson.getName());
            
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}

class Person {
    @JsonProperty("name")
    private String name;
    
    @JsonProperty("age")
    private int age;
    
    @JsonProperty("email")
    private String email;
    
    public Person() {} // Default constructor for Jackson
    
    public Person(String name, int age, String email) {
        this.name = name;
        this.age = age;
        this.email = email;
    }
    
    // Getters and setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public int getAge() { return age; }
    public void setAge(int age) { this.age = age; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}`,
        },
        "Spring Boot": {
            filename: "SpringBootApp.java",
            content: `import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
public class SpringBootApp {
    public static void main(String[] args) {
        SpringApplication.run(SpringBootApp.class, args);
    }
}

@RestController
class HelloController {
    
    @GetMapping("/")
    public String hello() {
        return "Hello, Spring Boot!";
    }
    
    @GetMapping("/api/users")
    public String getUsers() {
        return "{\\"users\\": [\\"John\\", \\"Jane\\", \\"Bob\\"]}";
    }
    
    @GetMapping("/health")
    public String health() {
        return "{\\"status\\": \\"UP\\"}";
    }
}`,
        },
    }

    return dependencies[dependencyName] || { filename: "dependency.java", content: "// Dependency not found" }
}

const generatePythonDependency = (dependencyName: string): { filename: string; content: string } => {
    const dependencies: DependencyMap = {
        NumPy: {
            filename: "numpy_example.py",
            content: `import numpy as np

# Create arrays
arr1 = np.array([1, 2, 3, 4, 5])
arr2 = np.array([6, 7, 8, 9, 10])

print("Array 1:", arr1)
print("Array 2:", arr2)

# Basic operations
print("Addition:", arr1 + arr2)
print("Multiplication:", arr1 * arr2)
print("Mean of arr1:", np.mean(arr1))
print("Standard deviation:", np.std(arr1))

# Matrix operations
matrix1 = np.array([[1, 2], [3, 4]])
matrix2 = np.array([[5, 6], [7, 8]])

print("Matrix 1:")
print(matrix1)
print("Matrix 2:")
print(matrix2)
print("Matrix multiplication:")
print(np.dot(matrix1, matrix2))

# Random numbers
random_array = np.random.rand(3, 3)
print("Random 3x3 matrix:")
print(random_array)`,
        },
        Pandas: {
            filename: "pandas_example.py",
            content: `import pandas as pd
import numpy as np

# Create a DataFrame
data = {
    'Name': ['Alice', 'Bob', 'Charlie', 'Diana'],
    'Age': [25, 30, 35, 28],
    'City': ['New York', 'London', 'Tokyo', 'Paris'],
    'Salary': [50000, 60000, 70000, 55000]
}

df = pd.DataFrame(data)
print("Original DataFrame:")
print(df)

# Basic operations
print("\\nDataFrame info:")
print(df.info())

print("\\nStatistical summary:")
print(df.describe())

# Filtering
high_salary = df[df['Salary'] > 55000]
print("\\nEmployees with salary > 55000:")
print(high_salary)

# Grouping
avg_salary_by_city = df.groupby('City')['Salary'].mean()
print("\\nAverage salary by city:")
print(avg_salary_by_city)

# Adding new column
df['Bonus'] = df['Salary'] * 0.1
print("\\nDataFrame with bonus column:")
print(df)`,
        },
        TensorFlow: {
            filename: "tensorflow_example.py",
            content: `import tensorflow as tf
import numpy as np

# Simple neural network example
print("TensorFlow version:", tf.__version__)

# Create sample data
X = np.array([[0, 0], [0, 1], [1, 0], [1, 1]], dtype=np.float32)
y = np.array([[0], [1], [1], [0]], dtype=np.float32)  # XOR problem

# Build model
model = tf.keras.Sequential([
    tf.keras.layers.Dense(4, activation='relu', input_shape=(2,)),
    tf.keras.layers.Dense(4, activation='relu'),
    tf.keras.layers.Dense(1, activation='sigmoid')
])

# Compile model
model.compile(optimizer='adam',
              loss='binary_crossentropy',
              metrics=['accuracy'])

print("Model summary:")
model.summary()

# Train model
print("\\nTraining model...")
history = model.fit(X, y, epochs=1000, verbose=0)

# Test model
predictions = model.predict(X)
print("\\nPredictions:")
for i in range(len(X)):
    print(f"Input: {X[i]} -> Predicted: {predictions[i][0]:.4f}, Actual: {y[i][0]}")

print(f"\\nFinal accuracy: {history.history['accuracy'][-1]:.4f}")`,
        },
    }

    return dependencies[dependencyName] || { filename: "dependency.py", content: "# Dependency not found" }
}

const generateCppDependency = (dependencyName: string): { filename: string; content: string } => {
    const dependencies: DependencyMap = {
        Boost: {
            filename: "boost_example.cpp",
            content: `#include <boost/algorithm/string.hpp>
#include <boost/filesystem.hpp>
#include <iostream>
#include <vector>
#include <string>

int main() {
    // String algorithms example
    std::string text = "Hello, Boost World!";
    std::vector<std::string> words;
    
    boost::split(words, text, boost::is_any_of(" ,!"));
    
    std::cout << "Split words:" << std::endl;
    for (const auto& word : words) {
        if (!word.empty()) {
            std::cout << "- " << word << std::endl;
        }
    }
    
    // String case conversion
    std::string upper_text = text;
    boost::to_upper(upper_text);
    std::cout << "\\nUppercase: " << upper_text << std::endl;
    
    // Filesystem example
    boost::filesystem::path current_path = boost::filesystem::current_path();
    std::cout << "\\nCurrent directory: " << current_path << std::endl;
    
    // Check if file exists
    boost::filesystem::path file_path = "example.txt";
    if (boost::filesystem::exists(file_path)) {
        std::cout << "File exists: " << file_path << std::endl;
    } else {
        std::cout << "File does not exist: " << file_path << std::endl;
    }
    
    return 0;
}`,
        },
        OpenCV: {
            filename: "opencv_example.cpp",
            content: `#include <opencv2/opencv.hpp>
#include <iostream>

int main() {
    // Create a simple image
    cv::Mat image = cv::Mat::zeros(400, 600, CV_8UC3);
    
    // Draw some shapes
    cv::rectangle(image, cv::Point(50, 50), cv::Point(200, 150), cv::Scalar(0, 255, 0), 2);
    cv::circle(image, cv::Point(300, 100), 50, cv::Scalar(255, 0, 0), -1);
    cv::line(image, cv::Point(400, 50), cv::Point(550, 150), cv::Scalar(0, 0, 255), 3);
    
    // Add text
    cv::putText(image, "OpenCV Example", cv::Point(50, 250), 
                cv::FONT_HERSHEY_SIMPLEX, 1, cv::Scalar(255, 255, 255), 2);
    
    // Display image
    cv::imshow("OpenCV Example", image);
    
    std::cout << "Press any key to continue..." << std::endl;
    cv::waitKey(0);
    cv::destroyAllWindows();
    
    // Image processing example
    cv::Mat gray_image;
    cv::cvtColor(image, gray_image, cv::COLOR_BGR2GRAY);
    
    cv::Mat blurred_image;
    cv::GaussianBlur(gray_image, blurred_image, cv::Size(15, 15), 0);
    
    cv::imshow("Blurred Grayscale", blurred_image);
    cv::waitKey(0);
    cv::destroyAllWindows();
    
    return 0;
}`,
        },
        Qt: {
            filename: "qt_example.cpp",
            content: `#include <QApplication>
#include <QWidget>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QPushButton>
#include <QLabel>
#include <QLineEdit>
#include <QMessageBox>

class MainWindow : public QWidget {
    Q_OBJECT

public:
    MainWindow(QWidget *parent = nullptr) : QWidget(parent) {
        setupUI();
        connectSignals();
    }

private slots:
    void onButtonClicked() {
        QString text = lineEdit->text();
        if (!text.isEmpty()) {
            label->setText("Hello, " + text + "!");
        } else {
            QMessageBox::warning(this, "Warning", "Please enter your name!");
        }
    }
    
    void onClearClicked() {
        lineEdit->clear();
        label->setText("Enter your name and click the button");
    }

private:
    void setupUI() {
        setWindowTitle("Qt Example Application");
        setFixedSize(300, 150);
        
        // Create widgets
        label = new QLabel("Enter your name and click the button");
        lineEdit = new QLineEdit();
        button = new QPushButton("Say Hello");
        clearButton = new QPushButton("Clear");
        
        // Create layouts
        QVBoxLayout *mainLayout = new QVBoxLayout();
        QHBoxLayout *buttonLayout = new QHBoxLayout();
        
        // Add widgets to layouts
        mainLayout->addWidget(label);
        mainLayout->addWidget(lineEdit);
        
        buttonLayout->addWidget(button);
        buttonLayout->addWidget(clearButton);
        mainLayout->addLayout(buttonLayout);
        
        setLayout(mainLayout);
    }
    
    void connectSignals() {
        connect(button, &QPushButton::clicked, this, &MainWindow::onButtonClicked);
        connect(clearButton, &QPushButton::clicked, this, &MainWindow::onClearClicked);
    }
    
    QLabel *label;
    QLineEdit *lineEdit;
    QPushButton *button;
    QPushButton *clearButton;
};

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);
    
    MainWindow window;
    window.show();
    
    return app.exec();
}

#include "qt_example.moc"`,
        },
    }

    return dependencies[dependencyName] || { filename: "dependency.cpp", content: "// Dependency not found" }
}

const generateJavaTemplate = (templateName: string): { filename: string; content: string } => {
    const templates: TemplateMap = {
        "Spring Boot Web App": {
            filename: "SpringWebApp.java",
            content: `import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@SpringBootApplication
public class SpringWebApp {
    public static void main(String[] args) {
        SpringApplication.run(SpringWebApp.class, args);
    }
}

@Controller
public class WebController {
    
    @GetMapping("/")
    public String home(Model model) {
        model.addAttribute("message", "Welcome to Spring Boot!");
        return "index";
    }
    
    @GetMapping("/about")
    public String about(Model model) {
        model.addAttribute("title", "About Us");
        return "about";
    }
}

@RestController
@RequestMapping("/api")
public class ApiController {
    
    @GetMapping("/hello")
    public String hello(@RequestParam(defaultValue = "World") String name) {
        return "Hello, " + name + "!";
    }
    
    @PostMapping("/data")
    public String postData(@RequestBody String data) {
        return "Received: " + data;
    }
}`,
        },
        "Console Application": {
            filename: "ConsoleApp.java",
            content: `import java.util.Scanner;
import java.util.ArrayList;
import java.util.List;

public class ConsoleApp {
    private static Scanner scanner = new Scanner(System.in);
    private static List<String> items = new ArrayList<>();
    
    public static void main(String[] args) {
        System.out.println("Welcome to the Console Application!");
        System.out.println("Type 'help' for available commands.");
        
        while (true) {
            System.out.print("> ");
            String input = scanner.nextLine().trim();
            
            if (input.equalsIgnoreCase("exit")) {
                System.out.println("Goodbye!");
                break;
            }
            
            processCommand(input);
        }
        
        scanner.close();
    }
    
    private static void processCommand(String command) {
        String[] parts = command.split(" ", 2);
        String cmd = parts[0].toLowerCase();
        
        switch (cmd) {
            case "help":
                showHelp();
                break;
            case "add":
                if (parts.length > 1) {
                    addItem(parts[1]);
                } else {
                    System.out.println("Usage: add <item>");
                }
                break;
            case "list":
                listItems();
                break;
            case "clear":
                clearItems();
                break;
            default:
                System.out.println("Unknown command. Type 'help' for available commands.");
        }
    }
    
    private static void showHelp() {
        System.out.println("Available commands:");
        System.out.println("  help  - Show this help message");
        System.out.println("  add   - Add an item to the list");
        System.out.println("  list  - Show all items");
        System.out.println("  clear - Clear all items");
        System.out.println("  exit  - Exit the application");
    }
    
    private static void addItem(String item) {
        items.add(item);
        System.out.println("Added: " + item);
    }
    
    private static void listItems() {
        if (items.isEmpty()) {
            System.out.println("No items in the list.");
        } else {
            System.out.println("Items:");
            for (int i = 0; i < items.size(); i++) {
                System.out.println("  " + (i + 1) + ". " + items.get(i));
            }
        }
    }
    
    private static void clearItems() {
        items.clear();
        System.out.println("All items cleared.");
    }
}`,
        },
    }

    return templates[templateName] || { filename: "template.java", content: "// Template not found" }
}

const generatePythonTemplate = (templateName: string): { filename: string; content: string } => {
    const templates: Record<string, { filename: string; content: string }> = {
        "Flask Web App": {
            filename: "flask_app.py",
            content: `from flask import Flask, jsonify, request

app = Flask(__name__)

# Sample data
sample_users = [
    {"id": 1, "name": "Alice", "email": "alice@example.com"},
    {"id": 2, "name": "Bob", "email": "bob@example.com"}
]

@app.route('/')
def home():
    return jsonify({"message": "Welcome to Flask App", "users": sample_users})

@app.route('/api/users', methods=['GET'])
def get_users():
    return jsonify(sample_users)

@app.route('/api/users', methods=['POST'])
def add_user():
    data = request.get_json()
    if data:
        new_user = {
            "id": len(sample_users) + 1,
            "name": data.get("name", "Unknown"),
            "email": data.get("email", "unknown@example.com")
        }
        sample_users.append(new_user)
        return jsonify(new_user), 201
    return jsonify({"error": "Invalid data"}), 400

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    user = next((u for u in sample_users if u["id"] == user_id), None)
    if user:
        return jsonify(user)
    return jsonify({"error": "User not found"}), 404

@app.route('/about')
def about():
    return jsonify({"message": "About Flask App", "version": "1.0"})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
`,
        },
        "Data Science Notebook": {
            filename: "data_analysis.py",
            content: `import pandas as pd
import numpy as np
import matplotlib.pyplot as plt

# Set style for plots
plt.style.use('default')

def load_sample_data():
    """Generate sample dataset for analysis"""
    np.random.seed(42)

    data = {
        'date': pd.date_range('2023-01-01', periods=100),
        'sales': np.random.normal(1000, 200, 100),
        'customers': np.random.poisson(50, 100),
        'category': np.random.choice(['A', 'B', 'C'], 100),
        'region': np.random.choice(['North', 'South', 'East', 'West'], 100)
    }

    return pd.DataFrame(data)

def analyze_data(df):
    """Perform basic data analysis"""
    print("Dataset Overview:")
    print(f"Shape: {df.shape}")
    print("\\nData Types:")
    print(df.dtypes)

    print("\\nStatistical Summary:")
    print(df.describe())

    print("\\nMissing Values:")
    print(df.isnull().sum())

def create_visualizations(df):
    """Create various plots for data visualization"""
    fig, axes = plt.subplots(2, 2, figsize=(15, 10))

    # Sales over time
    axes[0, 0].plot(df['date'], df['sales'])
    axes[0, 0].set_title('Sales Over Time')
    axes[0, 0].set_xlabel('Date')
    axes[0, 0].set_ylabel('Sales')

    # Sales distribution
    axes[0, 1].hist(df['sales'], bins=20, alpha=0.7)
    axes[0, 1].set_title('Sales Distribution')
    axes[0, 1].set_xlabel('Sales')
    axes[0, 1].set_ylabel('Frequency')

    # Sales by category
    category_sales = df.groupby('category')['sales'].mean()
    axes[1, 0].bar(category_sales.index, category_sales.values)
    axes[1, 0].set_title('Average Sales by Category')
    axes[1, 0].set_xlabel('Category')
    axes[1, 0].set_ylabel('Average Sales')

    # Simple correlation plot
    numeric_cols = df.select_dtypes(include=[np.number])
    corr_matrix = numeric_cols.corr()
    im = axes[1, 1].imshow(corr_matrix, cmap='coolwarm', aspect='auto')
    axes[1, 1].set_title('Correlation Matrix')

    plt.tight_layout()
    plt.show()

def main():
    """Main analysis pipeline"""
    print("Data Science Analysis Pipeline")
    print("=" * 40)

    # Load data
    df = load_sample_data()

    # Analyze data
    analyze_data(df)

    # Create visualizations
    create_visualizations(df)

    # Advanced analysis
    print("\\nAdvanced Analysis:")
    print("-" * 20)

    # Group by analysis
    region_stats = df.groupby('region').agg({
        'sales': ['mean', 'std', 'count'],
        'customers': 'mean'
    }).round(2)

    print("Sales Statistics by Region:")
    print(region_stats)

if __name__ == "__main__":
    main()`,
        },
    }

    return templates[templateName] || { filename: "template.py", content: "# Template not found" };
}

const generateCppTemplate = (templateName: string): { filename: string; content: string } => {
    const templates: TemplateMap = {
        "Console Application": {
            filename: "console_app.cpp",
            content: `#include <iostream>
#include <string>
#include <vector>
#include <algorithm>
#include <sstream>

class ConsoleApp {
private:
    std::vector<std::string> items;
    bool running;

public:
    ConsoleApp() : running(true) {}
    
    void run() {
        std::cout << "Welcome to the C++ Console Application!" << std::endl;
        std::cout << "Type 'help' for available commands." << std::endl;
        
        while (running) {
            std::cout << "> ";
            std::string input;
            std::getline(std::cin, input);
            
            processCommand(input);
        }
    }
    
private:
    void processCommand(const std::string& input) {
        std::istringstream iss(input);
        std::string command;
        iss >> command;
        
        std::transform(command.begin(), command.end(), command.begin(), ::tolower);
        
        if (command == "help") {
            showHelp();
        } else if (command == "add") {
            std::string item;
            std::getline(iss, item);
            if (!item.empty()) {
                item = item.substr(1); // Remove leading space
                addItem(item);
            } else {
                std::cout << "Usage: add <item>" << std::endl;
            }
        } else if (command == "list") {
            listItems();
        } else if (command == "remove") {
            int index;
            if (iss >> index) {
                removeItem(index - 1); // Convert to 0-based index
            } else {
                std::cout << "Usage: remove <index>" << std::endl;
            }
        } else if (command == "clear") {
            clearItems();
        } else if (command == "exit") {
            running = false;
            std::cout << "Goodbye!" << std::endl;
        } else {
            std::cout << "Unknown command. Type 'help' for available commands." << std::endl;
        }
    }
    
    void showHelp() {
        std::cout << "Available commands:" << std::endl;
        std::cout << "  help   - Show this help message" << std::endl;
        std::cout << "  add    - Add an item to the list" << std::endl;
        std::cout << "  list   - Show all items" << std::endl;
        std::cout << "  remove - Remove an item by index" << std::endl;
        std::cout << "  clear  - Clear all items" << std::endl;
        std::cout << "  exit   - Exit the application" << std::endl;
    }
    
    void addItem(const std::string& item) {
        items.push_back(item);
        std::cout << "Added: " << item << std::endl;
    }
    
    void listItems() {
        if (items.empty()) {
            std::cout << "No items in the list." << std::endl;
        } else {
            std::cout << "Items:" << std::endl;
            for (size_t i = 0; i < items.size(); ++i) {
                std::cout << "  " << (i + 1) << ". " << items[i] << std::endl;
            }
        }
    }
    
    void removeItem(int index) {
        if (index >= 0 && index < static_cast<int>(items.size())) {
            std::string removed = items[index];
            items.erase(items.begin() + index);
            std::cout << "Removed: " << removed << std::endl;
        } else {
            std::cout << "Invalid index." << std::endl;
        }
    }
    
    void clearItems() {
        items.clear();
        std::cout << "All items cleared." << std::endl;
    }
};

int main() {
    ConsoleApp app;
    app.run();
    return 0;
}`,
        },
        "Object-Oriented Project": {
            filename: "oop_example.cpp",
            content: `#include <iostream>
#include <string>
#include <vector>
#include <memory>

// Base class
class Animal {
protected:
    std::string name;
    int age;

public:
    Animal(const std::string& name, int age) : name(name), age(age) {}
    virtual ~Animal() = default;
    
    // Pure virtual function
    virtual void makeSound() const = 0;
    virtual void displayInfo() const {
        std::cout << "Name: " << name << ", Age: " << age;
    }
    
    // Getters
    std::string getName() const { return name; }
    int getAge() const { return age; }
};

// Derived class - Dog
class Dog : public Animal {
private:
    std::string breed;

public:
    Dog(const std::string& name, int age, const std::string& breed)
        : Animal(name, age), breed(breed) {}
    
    void makeSound() const override {
        std::cout << name << " says: Woof! Woof!" << std::endl;
    }
    
    void displayInfo() const override {
        Animal::displayInfo();
        std::cout << ", Breed: " << breed << std::endl;
    }
    
    void fetch() const {
        std::cout << name << " is fetching the ball!" << std::endl;
    }
};

// Derived class - Cat
class Cat : public Animal {
private:
    bool isIndoor;

public:
    Cat(const std::string& name, int age, bool isIndoor)
        : Animal(name, age), isIndoor(isIndoor) {}
    
    void makeSound() const override {
        std::cout << name << " says: Meow! Meow!" << std::endl;
    }
    
    void displayInfo() const override {
        Animal::displayInfo();
        std::cout << ", Indoor: " << (isIndoor ? "Yes" : "No") << std::endl;
    }
    
    void climb() const {
        std::cout << name << " is climbing the tree!" << std::endl;
    }
};

// Animal shelter class
class AnimalShelter {
private:
    std::vector<std::unique_ptr<Animal>> animals;

public:
    void addAnimal(std::unique_ptr<Animal> animal) {
        animals.push_back(std::move(animal));
        std::cout << "Added animal to shelter." << std::endl;
    }
    
    void displayAllAnimals() const {
        std::cout << "\\nAnimals in shelter:" << std::endl;
        std::cout << "===================" << std::endl;
        
        for (const auto& animal : animals) {
            animal->displayInfo();
            animal->makeSound();
            std::cout << std::endl;
        }
    }
    
    void makeAllSounds() const {
        std::cout << "\\nAll animals making sounds:" << std::endl;
        for (const auto& animal : animals) {
            animal->makeSound();
        }
    }
    
    size_t getAnimalCount() const {
        return animals.size();
    }
};

int main() {
    std::cout << "Object-Oriented Programming Example" << std::endl;
    std::cout << "===================================" << std::endl;
    
    // Create animal shelter
    AnimalShelter shelter;
    
    // Add animals to shelter
    shelter.addAnimal(std::make_unique<Dog>("Buddy", 3, "Golden Retriever"));
    shelter.addAnimal(std::make_unique<Cat>("Whiskers", 2, true));
    shelter.addAnimal(std::make_unique<Dog>("Max", 5, "German Shepherd"));
    shelter.addAnimal(std::make_unique<Cat>("Luna", 1, false));
    
    // Display all animals
    shelter.displayAllAnimals();
    
    // Make all animals make sounds
    shelter.makeAllSounds();
    
    std::cout << "\\nTotal animals in shelter: " << shelter.getAnimalCount() << std::endl;
    
    return 0;
}`,
        },
    }

    return templates[templateName] || { filename: "template.cpp", content: "// Template not found" }
}

export const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}
